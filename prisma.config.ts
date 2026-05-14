import { defineConfig } from 'prisma/config'

import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

dotenvExpand.expand(dotenv.config())

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.POSTGRES_URI,
  },
})
