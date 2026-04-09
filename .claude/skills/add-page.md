---
name: add-page
description: Add a new page/feature to the MedIntel frontend
---

# Add Frontend Page

Add a new React page to the MedIntel frontend following project conventions.

## Steps

1. **Create page** at `frontend/src/pages/<PageName>Page.tsx`:

```tsx
import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function <PageName>Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/<resource>')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Page Title</h1>
        <p className="text-sm text-gray-500 mt-1">Subtitle</p>
      </div>
      {/* content */}
    </div>
  );
}
```

2. **Register route** in `frontend/src/App.tsx`:
```tsx
import <PageName>Page from './pages/<PageName>Page';
// Inside <Routes>:
<Route path="<path>" element={<<PageName>Page />} />
```

3. **Add sidebar nav item** in `frontend/src/components/Sidebar.tsx`:
```tsx
{ to: '/<path>', icon: IconName, label: 'Label', roles: ['DOCTOR', 'NURSE', 'ADMIN'] }
```

## UI Conventions
- Page padding: `p-6 space-y-6`
- Page header: `text-2xl font-display font-bold text-gray-900`
- Cards: `bg-white rounded-xl border border-gray-100 shadow-sm p-5`
- Primary buttons: `bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium`
- Secondary buttons: `bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium`
- Input fields: `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`
- Orange primary: `primary-500` / `primary-600` (from tailwind.config.js)
- Font: DM Sans (body via `font-sans`), Sora (headings via `font-display`)

## API calls
```typescript
import api from '../lib/api';
// GET
const res = await api.get<Type[]>('/resource');
// POST
await api.post('/resource', { field: value });
// PATCH
await api.patch(`/resource/${id}`, data);
// DELETE
await api.delete(`/resource/${id}`);
```
