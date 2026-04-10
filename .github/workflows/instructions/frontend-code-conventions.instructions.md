---
description: 'Guidelines for building TanStack Start applications'
applyTo: '**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.css, **/*.scss, **/*.json'
---

# TanStack Start with Shadcn/ui Development Guide

You are an expert TypeScript developer specializing in TanStack Start applications with modern React patterns.

## Domain Alignment

Always consider the general user flow and application architecture. Align your implementation with the expectations and values that the application is supposed to provide.

## Tech Stack
- TypeScript (strict mode)
- Tailwind CSS (styling)
- ArkType (validation)
- TanStack Query (client state)
- Vite (we make an SPA application)

## Code Style Rules

- NEVER use `any` type - always use proper TypeScript types
- Prefer function components over class components
- Always validate external data with ArtType schemas
- Include error and pending boundaries for all routes
- Follow accessibility best practices with ARIA attributes

## Component Patterns

Use function components without TypeScript interfaces. NEVER use default exports.

```typescript
export const Button = ({ children, onClick, variant = 'primary' }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) => (
  <button onClick={onClick} className={cn(buttonVariants({ variant }))}>
    {children}
  </button>
);
```

## Data Fetching

Use Route Loaders for:
- Initial page data required for rendering

Use React Query for:
- Frequently updating data
- Optional/secondary data
- Client mutations with optimistic updates

```typescript
// Route Loader
export const Route = createFileRoute('/users')({
  loader: async () => {
    const users = await fetchUsers()
    return { users: userListSchema.parse(users) }
  },
  component: UserList,
})

// React Query
const { data: stats } = useQuery({
  queryKey: ['user-stats', userId],
  queryFn: () => fetchUserStats(userId),
  refetchInterval: 30000,
});
```

## ArtType Validation

Always validate external data. Define schemas in `src/lib/schemas.ts`:

```typescript
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).default('user'),
})

export type User = z.infer<typeof userSchema>

// Safe parsing
const result = userSchema.safeParse(data)
if (!result.success) {
  console.error('Validation failed:', result.error.format())
  return null
}
```

## Routes

Structure routes in `src/routes/` with file-based routing. Always include error and pending boundaries.

## UI Components

Use Tailwind for styling with responsive design:

```typescript
<div className="flex flex-col gap-4 p-6 md:flex-row md:gap-6">
  <Button className="w-full md:w-auto">Action</Button>
</div>
```

## Accessibility

Use semantic HTML first. Only add ARIA when no semantic equivalent exists:

```typescript
// ✅ Good: Semantic HTML with minimal ARIA
<button onClick={toggleMenu}>
  <MenuIcon aria-hidden="true" />
  <span className="sr-only">Toggle Menu</span>
</button>

// ✅ Good: ARIA only when needed (for dynamic states)
<button
  aria-expanded={isOpen}
  aria-controls="menu"
  onClick={toggleMenu}
>
  Menu
</button>

// ✅ Good: Semantic form elements
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
{errors.email && (
  <p role="alert">{errors.email}</p>
)}
```

## Import Standards

Use `@/` alias for all internal imports:

```typescript
// ✅ Good
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'

// ❌ Bad
import { Button } from '../components/ui/button'
```

## Adding Components

Add UI components as needed for your project requirements.

## Common Patterns

- Use route loaders for initial data, React Query for updates.
- Include error/pending boundaries on all routes.
- Prefer Shadcn components over custom UI.
- Use `@/` imports consistently.
- Follow accessibility best practices.
