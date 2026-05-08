import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import * as profilesRoutes from './routes/profiles.js';
import * as foodLogsRoutes from './routes/food-logs.js';
import * as exerciseLogsRoutes from './routes/exercise-logs.js';
import * as weightLogsRoutes from './routes/weight-logs.js';
import * as progressRoutes from './routes/progress.js';
import * as communityRoutes from './routes/community.js';
import * as vipRoutes from './routes/vip.js';
import * as aptosScoreRoutes from './routes/aptos-score.js';
import * as accountsRoutes from './routes/accounts.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth({
  emailAndPassword: {
    sendResetPassword: async ({ user, url }) => {
      app.logger.info({ email: user.email }, 'Password reset email would be sent');
    },
  },
});

// Register routes
profilesRoutes.register(app, app.fastify);
foodLogsRoutes.register(app, app.fastify);
exerciseLogsRoutes.register(app, app.fastify);
weightLogsRoutes.register(app, app.fastify);
progressRoutes.register(app, app.fastify);
communityRoutes.register(app, app.fastify);
vipRoutes.register(app, app.fastify);
aptosScoreRoutes.register(app, app.fastify);
accountsRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
