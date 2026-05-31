import { AdminModule } from '@/app/admin/admin.module'
import { DsBotModule } from '@/app/admin/ds-bot/ds-bot.module'
import { MonopolyAdminModule } from '@/app/admin/monopoly/monopoly-admin.module'
import type { Routes } from '@nestjs/core'

export const router: Routes = [
  {
    path: 'admin',
    module: AdminModule,
    children: [
      {
        path: 'ds-bot',
        module: DsBotModule,
      },
      {
        path: 'monopoly',
        module: MonopolyAdminModule,
      },
    ],
  },
]
