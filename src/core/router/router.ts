import { AdminModule } from "@/app/admin/admin-module.module";
import { DsBotModule } from "@/app/admin/ds-bot/ds-bot.module";

export const router = [
      {
        path: 'admin',
        module: AdminModule,
        children: [
          {
            path: 'ds-bot',
            module: DsBotModule,
          },
        ],
      },
    ]