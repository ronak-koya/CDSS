---
name: add-prisma-model
description: Add a new Prisma model to the MedIntel schema and push it to the database
---

# Add Prisma Model

Add a new model to `backend/prisma/schema.prisma` and push it to the SQLite database.

## Steps

1. **Read the schema** to understand existing models and relationships:
   Read `backend/prisma/schema.prisma`

2. **Add the model** following this pattern:

```prisma
model <ModelName> {
  id        String   @id @default(uuid())
  // foreign key
  patientId String
  patient   Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  // data fields
  field1    String
  field2    Int?
  flag      String   @default("normal") // use String for enums to keep it simple
  // timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

3. **Add back-reference** on the related model (e.g., Patient):
```prisma
model Patient {
  // ... existing fields ...
  <modelNamePlural> <ModelName>[]
}
```

4. **Push to database** — run `/db-push` (handles DLL lock on Windows)

5. **Update memory** — Add new model to `memory/schema_and_api.md`

## Field type rules
- Use `String` for date fields that store `"YYYY-MM-DD"` strings (NOT `DateTime`)
- Use `DateTime` only for actual timestamps like `createdAt`, `updatedAt`, `scheduledAt`
- Use `String` for status/enum fields to avoid Prisma enum migration complexity with SQLite
- Use `Int` for numeric counts/durations
- Use `Float` for decimal values (vitals, scores)
- JSON data: store as `String` and serialize/deserialize in the route handler

## After model addition
- Run `/db-push`
- Create corresponding API routes (see `/add-api-route`)
- Update `memory/schema_and_api.md`
