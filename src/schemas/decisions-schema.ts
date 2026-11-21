import type { CollectionSchema } from 'deepspace/schema'

export const decisionsSchema: CollectionSchema = {
  name: 'decisions',
  columns: [
    { name: 'document', storage: 'text', interpretation: { kind: 'json' }, required: true },
  ],
  // Ownership is assigned by the platform from the verified caller on creation.
  // Even the app admin follows the same private-record policy here.
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: 'own', create: true, update: 'own', delete: 'own' },
  },
}
