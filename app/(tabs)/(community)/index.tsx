import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import {
  Users,
  UserPlus,
  Heart,
  Search,
  UserCheck,
  Clock,
  Dumbbell,
  UtensilsCrossed,
  Share2,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import {
  getCommunityFeed,
  listFriends,
  listFriendRequests,
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  toggleLike,
} from '@/utils/api';
import type { Post, UserSummary, FriendRequest } from '@/utils/api';

type Tab = 'feed' | 'friends' | 'requests';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: COLORS.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(229,57,53,0.2)',
    }}>
      <Text style={{
        color: COLORS.primary,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: size * 0.35,
      }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

function FeedTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    console.log('[Community/Feed] Fetching community feed');
    setError(null);
    try {
      const data = await getCommunityFeed();
      setPosts(data.posts);
      console.log('[Community/Feed] Loaded', data.posts.length, 'posts');
    } catch (e) {
      console.error('[Community/Feed] Fetch error:', e);
      setError('Could not load feed. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchFeed(); }, [fetchFeed]));

  const handleRefresh = () => {
    console.log('[Community/Feed] Pull to refresh');
    setRefreshing(true);
    fetchFeed();
  };

  const handleLike = async (post: Post) => {
    console.log('[Community/Feed] Toggle like for post:', post.id);
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));
    try {
      const result = await toggleLike(post.id);
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, liked_by_me: result.liked, likes_count: result.likes_count } : p
      ));
    } catch (e) {
      console.error('[Community/Feed] Like error:', e);
      // Revert optimistic update
      setPosts(prev => prev.map(p =>
        p.id === post.id
          ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count }
          : p
      ));
    }
  };

  if (loading) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Users size={48} color={COLORS.textTertiary} />
        <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, textAlign: 'center' }}>
          Couldn't load feed
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center' }}>
          {error}
        </Text>
        <AnimatedPressable
          onPress={() => { setLoading(true); fetchFeed(); }}
          style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>Try again</Text>
        </AnimatedPressable>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={32} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17 }}>
          No posts yet
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
          Add friends to see their workouts and meals here
        </Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      renderItem={({ item: post, index }) => {
        const isWorkout = post.post_type === 'workout';
        const badgeColor = isWorkout ? COLORS.primary : COLORS.accent;
        const badgeLabel = isWorkout ? 'Workout' : 'Meal';
        const authorName = post.author?.name ?? 'Unknown';
        const timeText = timeAgo(post.created_at);
        const likeCount = String(post.likes_count);
        const isLiked = post.liked_by_me ?? false;

        return (
          <AnimatedListItem index={index}>
            <View style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 12,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={authorName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                    {authorName}
                  </Text>
                  <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }}>
                    {timeText}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: `${badgeColor}20`,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {isWorkout
                    ? <Dumbbell size={12} color={badgeColor} />
                    : <UtensilsCrossed size={12} color={badgeColor} />
                  }
                  <Text style={{ color: badgeColor, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 }}>
                    {badgeLabel}
                  </Text>
                </View>
              </View>

              {/* Content */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 }}>
                  {post.title}
                </Text>
                {post.description ? (
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                    {post.description}
                  </Text>
                ) : null}
                {post.data ? (
                  <View style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 10,
                    marginTop: 4,
                  }}>
                    <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={2}>
                      {post.data}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Footer */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AnimatedPressable
                  onPress={() => handleLike(post)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }}
                >
                  <Heart
                    size={18}
                    color={isLiked ? COLORS.primary : COLORS.textTertiary}
                    fill={isLiked ? COLORS.primary : 'transparent'}
                  />
                  <Text style={{
                    color: isLiked ? COLORS.primary : COLORS.textTertiary,
                    fontFamily: 'SpaceGrotesk_500Medium',
                    fontSize: 13,
                  }}>
                    {likeCount}
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </AnimatedListItem>
        );
      }}
    />
  );
}

// ─── Friends Tab ──────────────────────────────────────────────────────────────

function FriendsTab() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    fetchFriends();
  }, []));

  const fetchFriends = async () => {
    console.log('[Community/Friends] Fetching friends list');
    setLoadingFriends(true);
    try {
      const data = await listFriends();
      setFriends(data.friends);
      console.log('[Community/Friends] Loaded', data.friends.length, 'friends');
    } catch (e) {
      console.error('[Community/Friends] Fetch error:', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      console.log('[Community/Friends] Searching users:', text);
      setSearching(true);
      try {
        const data = await searchUsers(text.trim());
        setSearchResults(data.users);
        console.log('[Community/Friends] Search returned', data.users.length, 'results');
      } catch (e) {
        console.error('[Community/Friends] Search error:', e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleAddFriend = async (user: UserSummary) => {
    console.log('[Community/Friends] Send friend request to:', user.id, user.name);
    setSendingRequest(user.id);
    try {
      await sendFriendRequest(user.id);
      setSearchResults(prev => prev.map(u =>
        u.id === user.id ? { ...u, friendship_status: 'pending_sent' } : u
      ));
      console.log('[Community/Friends] Friend request sent to:', user.name);
    } catch (e) {
      console.error('[Community/Friends] Send request error:', e);
    } finally {
      setSendingRequest(null);
    }
  };

  const statusLabel = (status?: UserSummary['friendship_status']) => {
    if (status === 'friends') return 'Friends';
    if (status === 'pending_sent') return 'Pending';
    if (status === 'pending_received') return 'Respond';
    return null;
  };

  const statusColor = (status?: UserSummary['friendship_status']) => {
    if (status === 'friends') return COLORS.success;
    if (status === 'pending_sent') return COLORS.textSecondary;
    if (status === 'pending_received') return COLORS.warning;
    return COLORS.primary;
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        gap: 10,
      }}>
        <Search size={18} color={COLORS.textTertiary} />
        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            height: 48,
            color: COLORS.text,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontSize: 15,
          }}
        />
      </View>

      {/* Search results */}
      {query.trim().length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
            Search results
          </Text>
          {searching ? (
            <SkeletonCard />
          ) : searchResults.length === 0 ? (
            <View style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
            }}>
              <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 }}>
                No users found
              </Text>
            </View>
          ) : (
            searchResults.map((user, idx) => {
              const label = statusLabel(user.friendship_status);
              const color = statusColor(user.friendship_status);
              const canAdd = !user.friendship_status || user.friendship_status === 'none';
              const isSending = sendingRequest === user.id;

              return (
                <AnimatedListItem key={user.id} index={idx}>
                  <View style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <Avatar name={user.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                    {label ? (
                      <View style={{
                        backgroundColor: `${color}20`,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}>
                        <Text style={{ color, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 }}>
                          {label}
                        </Text>
                      </View>
                    ) : canAdd ? (
                      <AnimatedPressable
                        onPress={() => handleAddFriend(user)}
                        disabled={isSending}
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <UserPlus size={14} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 }}>
                          {isSending ? 'Sending...' : 'Add'}
                        </Text>
                      </AnimatedPressable>
                    ) : null}
                  </View>
                </AnimatedListItem>
              );
            })
          )}
        </View>
      )}

      {/* Friends list */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 }}>
          Your friends
        </Text>
        {loadingFriends ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : friends.length === 0 ? (
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 32,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
            gap: 10,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={28} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 }}>
              No friends yet
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 240 }}>
              Search for people above to start building your fitness community
            </Text>
          </View>
        ) : (
          friends.map((friend, idx) => (
            <AnimatedListItem key={friend.id} index={idx}>
              <View style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <Avatar name={friend.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={1}>
                    {friend.email}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: `${COLORS.success}20`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <UserCheck size={12} color={COLORS.success} />
                  <Text style={{ color: COLORS.success, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11 }}>
                    Friends
                  </Text>
                </View>
              </View>
            </AnimatedListItem>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const fetchRequests = async () => {
    console.log('[Community/Requests] Fetching friend requests');
    setLoading(true);
    try {
      const data = await listFriendRequests();
      const pending = data.requests.filter(r => r.status === 'pending');
      setRequests(pending);
      onCountChange(pending.length);
      console.log('[Community/Requests] Loaded', pending.length, 'pending requests');
    } catch (e) {
      console.error('[Community/Requests] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (req: FriendRequest, status: 'accepted' | 'declined') => {
    console.log('[Community/Requests] Responding to request:', req.id, status);
    setResponding(req.id);
    try {
      await respondFriendRequest(req.id, status);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      onCountChange(requests.length - 1);
      console.log('[Community/Requests] Request', status, ':', req.id);
    } catch (e) {
      console.error('[Community/Requests] Respond error:', e);
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <UserPlus size={32} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17 }}>
          No pending requests
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
          Friend requests you receive will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {requests.map((req, idx) => {
        const requesterName = req.requester?.name ?? 'Unknown';
        const requesterEmail = req.requester?.email ?? '';
        const timeText = timeAgo(req.created_at);
        const isResponding = responding === req.id;

        return (
          <AnimatedListItem key={req.id} index={idx}>
            <View style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={requesterName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                    {requesterName}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12 }} numberOfLines={1}>
                    {requesterEmail}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={11} color={COLORS.textTertiary} />
                    <Text style={{ color: COLORS.textTertiary, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11 }}>
                      {timeText}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AnimatedPressable
                  onPress={() => handleRespond(req, 'accepted')}
                  disabled={isResponding}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.primary,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                    {isResponding ? 'Accepting...' : 'Accept'}
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => handleRespond(req, 'declined')}
                  disabled={isResponding}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.surfaceSecondary,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 }}>
                    Decline
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </AnimatedListItem>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [requestCount, setRequestCount] = useState(0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: requestCount > 0 ? `Requests (${requestCount})` : 'Requests' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Community',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[Community] Open share post sheet');
                router.push('/share-post');
              }}
              style={{ padding: 8 }}
            >
              <Share2 size={22} color={COLORS.textSecondary} />
            </AnimatedPressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Tab switcher */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
          gap: 4,
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                onPress={() => {
                  console.log('[Community] Switch tab to:', tab.key);
                  setActiveTab(tab.key);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isActive ? COLORS.primaryMuted : 'transparent',
                  borderWidth: 1,
                  borderColor: isActive ? 'rgba(229,57,53,0.2)' : COLORS.border,
                }}
              >
                <Text style={{
                  color: isActive ? COLORS.primary : COLORS.textSecondary,
                  fontFamily: isActive ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_400Regular',
                  fontSize: 13,
                }}>
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Tab content */}
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'requests' && <RequestsTab onCountChange={setRequestCount} />}
      </View>
    </>
  );
}
