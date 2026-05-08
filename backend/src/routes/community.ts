import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc, asc, inArray, ilike } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  friendship_status: 'friends' | 'pending_sent' | 'pending_received' | 'none';
}

interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester: UserSummary;
}

interface Post {
  id: string;
  user_id: string;
  post_type: string;
  title: string;
  description: string | null;
  data: string;
  likes_count: number;
  liked_by_me: boolean;
  author: { id: string; name: string; email: string };
  created_at: string;
}

function generateId(): string {
  return randomUUID();
}

async function getFriendshipStatus(userId: string, targetUserId: string, db: any): Promise<'friends' | 'pending_sent' | 'pending_received' | 'none'> {
  // Check if friends
  const friendshipCheck = await db.select().from(schema.friendRequests).where(
    and(
      or(
        and(eq(schema.friendRequests.requester_id, userId), eq(schema.friendRequests.recipient_id, targetUserId)),
        and(eq(schema.friendRequests.requester_id, targetUserId), eq(schema.friendRequests.recipient_id, userId)),
      ),
      eq(schema.friendRequests.status, 'accepted'),
    ),
  );

  if (friendshipCheck.length > 0) {
    return 'friends';
  }

  // Check if pending sent
  const pendingSent = await db.select().from(schema.friendRequests).where(
    and(
      eq(schema.friendRequests.requester_id, userId),
      eq(schema.friendRequests.recipient_id, targetUserId),
      eq(schema.friendRequests.status, 'pending'),
    ),
  );

  if (pendingSent.length > 0) {
    return 'pending_sent';
  }

  // Check if pending received
  const pendingReceived = await db.select().from(schema.friendRequests).where(
    and(
      eq(schema.friendRequests.requester_id, targetUserId),
      eq(schema.friendRequests.recipient_id, userId),
      eq(schema.friendRequests.status, 'pending'),
    ),
  );

  if (pendingReceived.length > 0) {
    return 'pending_received';
  }

  return 'none';
}

async function getSessionFromRequest(request: any, app: App) {
  try {
    // First try to get session from headers (for Bearer token auth)
    const headers = new Headers();
    Object.entries(request.headers || {}).forEach(([key, value]) => {
      if (value) {
        headers.append(key, Array.isArray(value) ? value[0] : String(value));
      }
    });

    const session = await app.auth.api.getSession({ headers });
    if (session?.user) {
      return session;
    }
  } catch (error) {
    // Ignore errors and fall back to requireAuth
  }

  // Fall back to requireAuth if header-based auth failed
  return null;
}

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/users/search
  fastify.get('/api/users/search', {
    schema: {
      description: 'Search users by name or email',
      tags: ['community'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', description: 'Search query' },
        },
      },
      response: {
        200: {
          description: 'Search results',
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  friendship_status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    const { q } = request.query;
    app.logger.info({ userId: session.user.id, q }, 'Searching users');

    const searchResults = await app.db
      .select()
      .from(authSchema.user)
      .where(
        or(
          ilike(authSchema.user.name, `%${q}%`),
          ilike(authSchema.user.email, `%${q}%`),
        ),
      );

    const filteredResults = searchResults.filter(u => u.id !== session.user.id);

    const users: UserSummary[] = [];
    for (const u of filteredResults) {
      const friendship_status = await getFriendshipStatus(session.user.id, u.id, app.db);
      users.push({
        id: u.id,
        name: u.name,
        email: u.email,
        friendship_status,
      });
    }

    app.logger.info({ userId: session.user.id, resultCount: users.length }, 'User search completed');

    return { users };
  });

  // GET /api/friends
  fastify.get('/api/friends', {
    schema: {
      description: 'Get list of friends',
      tags: ['community'],
      response: {
        200: {
          description: 'Friends list',
          type: 'object',
          properties: {
            friends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  friendship_status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    app.logger.info({ userId: session.user.id }, 'Fetching friends list');

    const friendships = await app.db
      .select()
      .from(schema.friendRequests)
      .where(
        and(
          eq(schema.friendRequests.status, 'accepted'),
          or(
            eq(schema.friendRequests.requester_id, session.user.id),
            eq(schema.friendRequests.recipient_id, session.user.id),
          ),
        ),
      );

    const friendIds = friendships.map(f =>
      f.requester_id === session.user.id ? f.recipient_id : f.requester_id,
    );

    let friends: UserSummary[] = [];
    if (friendIds.length > 0) {
      const friendUsers = await app.db
        .select()
        .from(authSchema.user)
        .where(inArray(authSchema.user.id, friendIds));

      friends = friendUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        friendship_status: 'friends' as const,
      }));
    }

    app.logger.info({ userId: session.user.id, friendCount: friends.length }, 'Friends list retrieved');

    return { friends };
  });

  // GET /api/friend-requests
  fastify.get('/api/friend-requests', {
    schema: {
      description: 'Get incoming friend requests',
      tags: ['community'],
      response: {
        200: {
          description: 'Friend requests',
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  requester_id: { type: 'string' },
                  recipient_id: { type: 'string' },
                  status: { type: 'string' },
                  created_at: { type: 'string' },
                  requester: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      friendship_status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    app.logger.info({ userId: session.user.id }, 'Fetching friend requests');

    const requests = await app.db
      .select()
      .from(schema.friendRequests)
      .where(
        and(
          eq(schema.friendRequests.recipient_id, session.user.id),
          eq(schema.friendRequests.status, 'pending'),
        ),
      );

    const requestsWithRequester: FriendRequest[] = [];
    for (const req of requests) {
      const requester = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, req.requester_id));

      if (requester.length > 0) {
        const u = requester[0];
        requestsWithRequester.push({
          id: req.id,
          requester_id: req.requester_id,
          recipient_id: req.recipient_id,
          status: req.status,
          created_at: req.created_at,
          requester: {
            id: u.id,
            name: u.name,
            email: u.email,
            friendship_status: 'pending_received',
          },
        });
      }
    }

    app.logger.info({ userId: session.user.id, requestCount: requestsWithRequester.length }, 'Friend requests retrieved');

    return { requests: requestsWithRequester };
  });

  // POST /api/friend-requests
  fastify.post('/api/friend-requests', {
    schema: {
      description: 'Create a friend request',
      tags: ['community'],
      body: {
        type: 'object',
        required: ['recipient_id'],
        properties: {
          recipient_id: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Friend request created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            requester_id: { type: 'string' },
            recipient_id: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string' },
            requester: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                friendship_status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { recipient_id: string } }>, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    const { recipient_id } = request.body;
    app.logger.info({ userId: session.user.id, recipientId: recipient_id }, 'Creating friend request');

    const id = generateId();
    const now = new Date().toISOString();

    const created = await app.db
      .insert(schema.friendRequests)
      .values({
        id,
        requester_id: session.user.id,
        recipient_id,
        status: 'pending',
        created_at: now,
      })
      .returning();

    const requester = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, session.user.id));

    app.logger.info({ id, userId: session.user.id }, 'Friend request created successfully');

    reply.status(201);
    return {
      id: created[0].id,
      requester_id: created[0].requester_id,
      recipient_id: created[0].recipient_id,
      status: created[0].status,
      created_at: created[0].created_at,
      requester: {
        id: requester[0].id,
        name: requester[0].name,
        email: requester[0].email,
        friendship_status: 'pending_sent',
      },
    };
  });

  // PUT /api/friend-requests/:id
  fastify.put('/api/friend-requests/:id', {
    schema: {
      description: 'Update a friend request (accept or decline)',
      tags: ['community'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['accepted', 'declined'] },
        },
      },
      response: {
        200: {
          description: 'Friend request updated',
          type: 'object',
          properties: {
            id: { type: 'string' },
            requester_id: { type: 'string' },
            recipient_id: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string' },
            requester: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                friendship_status: { type: 'string' },
              },
            },
          },
        },
        403: {
          description: 'Forbidden - only recipient can update',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { status: 'accepted' | 'declined' } }>, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    const { id } = request.params;
    const { status } = request.body;

    app.logger.info({ userId: session.user.id, requestId: id, status }, 'Updating friend request');

    const friendRequest = await app.db
      .select()
      .from(schema.friendRequests)
      .where(eq(schema.friendRequests.id, id));

    if (friendRequest.length === 0) {
      return reply.status(404).send({ error: 'Friend request not found' });
    }

    const req = friendRequest[0];

    if (req.recipient_id !== session.user.id) {
      app.logger.warn({ userId: session.user.id, requestId: id }, 'User not authorized to update friend request');
      return reply.status(403).send({ error: 'Only recipient can update this request' });
    }

    const updated = await app.db
      .update(schema.friendRequests)
      .set({ status })
      .where(eq(schema.friendRequests.id, id))
      .returning();

    const requester = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, req.requester_id));

    app.logger.info({ id, status }, 'Friend request updated successfully');

    return {
      id: updated[0].id,
      requester_id: updated[0].requester_id,
      recipient_id: updated[0].recipient_id,
      status: updated[0].status,
      created_at: updated[0].created_at,
      requester: {
        id: requester[0].id,
        name: requester[0].name,
        email: requester[0].email,
        friendship_status: status === 'accepted' ? 'friends' : 'none',
      },
    };
  });

  // GET /api/community/feed
  fastify.get('/api/community/feed', {
    schema: {
      description: 'Get community feed from friends',
      tags: ['community'],
      response: {
        200: {
          description: 'Community feed',
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  user_id: { type: 'string' },
                  post_type: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  data: { type: 'string' },
                  likes_count: { type: 'number' },
                  liked_by_me: { type: 'boolean' },
                  author: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    app.logger.info({ userId: session.user.id }, 'Fetching community feed');

    // Get all accepted friendships
    const friendships = await app.db
      .select()
      .from(schema.friendRequests)
      .where(
        and(
          eq(schema.friendRequests.status, 'accepted'),
          or(
            eq(schema.friendRequests.requester_id, session.user.id),
            eq(schema.friendRequests.recipient_id, session.user.id),
          ),
        ),
      );

    const friendIds = friendships.map(f =>
      f.requester_id === session.user.id ? f.recipient_id : f.requester_id,
    );

    let posts: Post[] = [];
    if (friendIds.length > 0) {
      const sharedPosts = await app.db
        .select()
        .from(schema.sharedPosts)
        .where(inArray(schema.sharedPosts.user_id, friendIds))
        .orderBy(desc(schema.sharedPosts.created_at))
        .limit(50);

      // Get liked posts for current user
      const likedPosts = await app.db
        .select({ post_id: schema.postLikes.post_id })
        .from(schema.postLikes)
        .where(eq(schema.postLikes.user_id, session.user.id));

      const likedPostIds = new Set(likedPosts.map(l => l.post_id));

      for (const post of sharedPosts) {
        const author = await app.db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.id, post.user_id));

        if (author.length > 0) {
          posts.push({
            id: post.id,
            user_id: post.user_id,
            post_type: post.post_type,
            title: post.title,
            description: post.description,
            data: post.data,
            likes_count: post.likes_count,
            liked_by_me: likedPostIds.has(post.id),
            author: {
              id: author[0].id,
              name: author[0].name,
              email: author[0].email,
            },
            created_at: post.created_at,
          });
        }
      }
    }

    app.logger.info({ userId: session.user.id, postCount: posts.length }, 'Community feed retrieved');

    return { posts };
  });

  // POST /api/community/posts
  fastify.post('/api/community/posts', {
    schema: {
      description: 'Create a new community post',
      tags: ['community'],
      body: {
        type: 'object',
        required: ['post_type', 'title', 'data'],
        properties: {
          post_type: { type: 'string', enum: ['workout', 'meal'] },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          data: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Post created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            post_type: { type: 'string' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            data: { type: 'string' },
            likes_count: { type: 'number' },
            liked_by_me: { type: 'boolean' },
            author: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
            created_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { post_type: string; title: string; description?: string; data: string } }>, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    const { post_type, title, description, data } = request.body;
    const id = generateId();
    const now = new Date().toISOString();

    app.logger.info({ userId: session.user.id, postId: id }, 'Creating community post');

    const created = await app.db
      .insert(schema.sharedPosts)
      .values({
        id,
        user_id: session.user.id,
        post_type: post_type as any,
        title,
        description: description || null,
        data,
        likes_count: 0,
        created_at: now,
      })
      .returning();

    const author = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, session.user.id));

    app.logger.info({ id, userId: session.user.id }, 'Post created successfully');

    reply.status(201);
    return {
      id: created[0].id,
      user_id: created[0].user_id,
      post_type: created[0].post_type,
      title: created[0].title,
      description: created[0].description,
      data: created[0].data,
      likes_count: created[0].likes_count,
      liked_by_me: false,
      author: {
        id: author[0].id,
        name: author[0].name,
        email: author[0].email,
      },
      created_at: created[0].created_at,
    };
  });

  // POST /api/community/posts/:id/like
  fastify.post('/api/community/posts/:id/like', {
    schema: {
      description: 'Toggle like on a post',
      tags: ['community'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Like toggled',
          type: 'object',
          properties: {
            liked: { type: 'boolean' },
            likes_count: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    let session = await getSessionFromRequest(request, app);
    if (!session) {
      session = await requireAuth(request, reply);
      if (!session) return;
    }

    const { id } = request.params;
    app.logger.info({ userId: session.user.id, postId: id }, 'Toggling like on post');

    // Check if already liked
    const existingLike = await app.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.post_id, id),
          eq(schema.postLikes.user_id, session.user.id),
        ),
      );

    let liked = false;
    let likes_count = 0;

    if (existingLike.length > 0) {
      // Unlike: delete the like
      await app.db
        .delete(schema.postLikes)
        .where(
          and(
            eq(schema.postLikes.post_id, id),
            eq(schema.postLikes.user_id, session.user.id),
          ),
        );

      // Decrement likes_count
      const post = await app.db
        .select()
        .from(schema.sharedPosts)
        .where(eq(schema.sharedPosts.id, id));

      if (post.length > 0) {
        const newCount = Math.max(0, post[0].likes_count - 1);
        await app.db
          .update(schema.sharedPosts)
          .set({ likes_count: newCount })
          .where(eq(schema.sharedPosts.id, id));
        likes_count = newCount;
      }

      liked = false;
    } else {
      // Like: insert the like
      const likeId = generateId();
      const now = new Date().toISOString();

      await app.db
        .insert(schema.postLikes)
        .values({
          id: likeId,
          post_id: id,
          user_id: session.user.id,
          created_at: now,
        });

      // Increment likes_count
      const post = await app.db
        .select()
        .from(schema.sharedPosts)
        .where(eq(schema.sharedPosts.id, id));

      if (post.length > 0) {
        const newCount = post[0].likes_count + 1;
        await app.db
          .update(schema.sharedPosts)
          .set({ likes_count: newCount })
          .where(eq(schema.sharedPosts.id, id));
        likes_count = newCount;
      }

      liked = true;
    }

    app.logger.info({ postId: id, userId: session.user.id, liked }, 'Like toggled successfully');

    return { liked, likes_count };
  });
}
