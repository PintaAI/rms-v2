# User Manual Authoring Guide

Panduan untuk membuat/mengedit dokumen user manual dengan dukungan demo komponen React.

---

## Struktur Folder

```
user-manual/                                    # Markdown files
├── 01-overview[RiBook2Line].md
├── 02-alur-servis[RiFlowChart].md
└── ...

components/user-manual/
├── user-manual-content.tsx                     # Renderer utama
├── table-of-contents.tsx
└── demo-components/                            # Demo components
    ├── index.ts                                # Export registry
    ├── status-badge-demo.tsx
    ├── service-card-demo.tsx
    ├── service-table-demo.tsx
    ├── invoice-demo.tsx
    └── sidebar-nav-demo.tsx

lib/markdown.ts                                 # Parser + icon extraction
app/api/user-manual/route.ts                    # API endpoint
```

---

## Naming Convention File Markdown

### Format

```
{number}-{slug}[{icon-name}].md
```

### Contoh

```
01-overview[RiBook2Line].md
02-alur-servis[RiFlowChart].md
07-multi-toko[RiStoreLine].md
```

### Komponen

| Bagian | Keterangan | Contoh |
|--------|------------|--------|
| **number** | Urutan sidebar (2 digit) | `01`, `02`, `07` |
| **slug** | URL-friendly (kebab-case) | `overview`, `alur-servis` |
| **icon** | Nama icon Remix Icon (dalam kurung siku) | `RiBook2Line` |

### URL yang Dihasilkan

- File: `01-overview[RiBook2Line].md`
- URL: `/user-manual?doc=01-overview` (tanpa icon suffix)
- Sidebar: Icon `RiBook2Line` + Title dari H1

### Menambah Icon Baru

1. Cari icon di [Remix Icon](https://remixicon.com/)
2. Tambahkan nama icon ke filename: `[RiYourIcon]`
3. Import icon di `components/user-manual/user-manual-content.tsx`:

```tsx
import { RiYourIcon, /* existing icons */ } from "@remixicon/react";

const iconMap: Record<string, React.ComponentType<{ className?: string }> | undefined> = {
  RiYourIcon, // ← Tambahkan di sini
  // ...
};
```

---

## Struktur Konten Markdown

### Template Dasar

```markdown
# Judul Dokumen (H1 → ditampilkan di sidebar)

Paragraf pembuka.

---

## Section 1 (H2 → muncul di Table of Contents)

Konten section.

### Sub-section (H3)

Detail.

---

## Section 2

:::demo ComponentName

Konten lanjutan.
```

### Fitur yang Didukung

| Fitur | Syntax |
|-------|--------|
| **Heading** | `#`, `##`, `###` |
| **Tabel** | GitHub-flavored markdown tables |
| **Code block** | \`\`\`language |
| **Mermaid diagram** | \`\`\`mermaid |
| **Demo component** | `:::demo ComponentName` |
| **Internal link** | `[text](?doc=02-alur-servis)` |

---

## Embedding Demo Components

### Syntax

```markdown
:::demo ComponentName
```

**Penting:**
- `:::demo` + spasi + nama component
- Harus di baris sendiri (paragraph)
- Tanpa closing `:::` (opsional)

### Demo Components yang Tersedia

| Nama | Deskripsi | Dokumen yang Menggunakan |
|------|-----------|--------------------------|
| `StatusBadge` | Menampilkan semua status badge (Masuk, Proses, Selesai, Gagal, Diambil) | `02-alur-servis` |
| `ServiceTable` | Real `ServiceTable` component dengan mock data | `04-service-ticket` |
| `ServiceCard` | Simplified service ticket card | `04-service-ticket` |
| `Invoice` | Invoice demo dengan items & grand total | `06-invoice-pembayaran` |
| `SidebarNav` | Sidebar navigasi untuk 3 role (Admin/Staff/Teknisi) | `03-role-dan-akses` |

### Contoh Penggunaan

```markdown
## Status Servis

Berikut semua status yang ada di sistem:

:::demo StatusBadge

Penjelasan masing-masing status...
```

---

## Membuat Demo Component Baru

### Step 1: Buat File Component

Buat file baru di `components/user-manual/demo-components/`:

```tsx
// components/user-manual/demo-components/my-feature-demo.tsx
"use client";

import { Card } from "@/components/ui/card";
// Import komponen UI atau component lain yang dibutuhkan

export function MyFeatureDemo() {
  return (
    <Card className="my-4">
      {/* Demo content */}
    </Card>
  );
}
```

### Step 2: Export dari Index

Tambahkan export di `components/user-manual/demo-components/index.ts`:

```tsx
export { MyFeatureDemo } from "./my-feature-demo";
```

### Step 3: Register di User Manual Content

Tambahkan import + entry di `components/user-manual/user-manual-content.tsx`:

```tsx
import {
  // existing imports
  MyFeatureDemo, // ← Add import
} from "./demo-components";

const demoComponentsMap: Record<string, React.ComponentType> = {
  // existing entries
  MyFeature: MyFeatureDemo, // ← Add entry (key = nama untuk :::demo)
};
```

### Step 4: Gunakan di Markdown

```markdown
:::demo MyFeature
```

---

## Best Practices untuk Demo Component

### ✓ DO

1. **Gunakan real component dari UI library**
   ```tsx
   import { ServiceTable } from "@/components/dashboard/services/service-table/service-table";
   
   export function ServiceTableDemo() {
     return <ServiceTable services={mockData} preset="adminActive" disableAssignment />;
   }
   ```

2. **Siapkan mock data yang realistis**
   - Gunakan tipe dari component asli
   - Data harus merepresentasikan kasus nyata
   - Include semua variasi status/kondisi

3. **Handle Next.js router hooks**
   - Jika component asli menggunakan `useRouter`, `usePathname`, `useSearchParams`
   - Buat versi simplified tanpa hooks tersebut
   - Lihat contoh di `sidebar-nav-demo.tsx`

4. **Disable interactive features yang butuh server**
   - Set prop seperti `disableAssignment`, `readOnly`
   - Hindari server action calls di demo

### ✗ DON'T

1. **Jangan panggil server action di demo**
   ```tsx
   // ❌ Akan error di demo
   useEffect(() => {
     fetchData().then(setData);
   }, []);
   ```

2. **Jangan gunakan router hooks tanpa context**
   ```tsx
   // ❌ Error "invariant expected app router to be mounted"
   const router = useRouter();
   ```

3. **Jangan render sidebar tanpa SidebarProvider**
   ```tsx
   // ❌ Error "useSidebar must be used within a SidebarProvider"
   <Sidebar>...</Sidebar>
   ```

---

## Handling Special Cases

### Case 1: Component Butuh Context/Provider

Wrap dengan provider-nya di demo:

```tsx
<SidebarProvider className="!min-h-0 !w-full">
  <Sidebar collapsible="none" className="!w-full">
    {/* content */}
  </Sidebar>
</SidebarProvider>
```

**Penting untuk Sidebar:** Gunakan `collapsible="none"` agar tidak full viewport.

### Case 2: Component Butuh Router

Buat simplified version tanpa router:

```tsx
// ❌ Versi asli dengan router
function NavItem({ href, label }) {
  const pathname = usePathname();
  return <Link href={href}>...</Link>;
}

// ✓ Versi demo tanpa router
function DemoNavItem({ label, active }) {
  return <SidebarMenuButton isActive={active}>{label}</SidebarMenuButton>;
}
```

### Case 3: Component Fetch Data

Override dengan mock data via props:

```tsx
// Component asli punya useEffect yang fetch data
// Di demo, berikan mock data lewat props agar tidak trigger fetch
<MyComponent data={mockData} />
```

---

## Parser Implementation Detail

### Icon Extraction (lib/markdown.ts)

```typescript
// Regex: [RiIconName].md
const iconMatch = filename.match(/\[([A-Za-z]+)\]\.md$/);
const icon = iconMatch ? iconMatch[1] : "RiFileLine";

// Strip icon untuk slug
const slug = filename.replace(/\[([A-Za-z]+)\]\.md$/, ".md").replace(".md", "");
```

### Demo Block Transformation

```typescript
function remarkDemoBlocks() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      const textContent = /* extract text */;
      const match = textContent.match(/^:::demo\s+(\w+)\s*(?::::)?$/);
      if (match) {
        // Replace paragraph with HTML placeholder
        parent.children[index] = {
          type: "html",
          value: `<div data-demo="${match[1]}"></div>`,
        };
      }
    });
  };
}
```

### Rendering

Di `user-manual-content.tsx`, setelah HTML di-inject:

```tsx
const demoElements = contentRef.current.querySelectorAll("[data-demo]");
demoElements.forEach((el) => {
  const componentName = el.getAttribute("data-demo");
  if (componentName && demoComponentsMap[componentName]) {
    const DemoComponent = demoComponentsMap[componentName];
    const root = createRoot(el as HTMLElement);
    root.render(<DemoComponent />);
  }
});
```

---

## Workflow Menambah Dokumen Baru

### Checklist

- [ ] Buat file markdown dengan format `{NN}-{slug}[{icon}].md`
- [ ] H1 sebagai judul dokumen
- [ ] Struktur dengan H2 untuk section (muncul di TOC)
- [ ] (Opsional) Import icon baru di `user-manual-content.tsx`
- [ ] (Opsional) Buat demo component jika butuh illustrasi
- [ ] Test rendering di `/user-manual?doc={slug}`
- [ ] Update `01-overview.md` jika perlu link baru

### Contoh Lengkap

1. **File:** `user-manual/08-backup-restore[RiRefreshLine].md`

```markdown
# Backup & Restore

Panduan backup dan restore data RMS.

---

## Apa itu Backup?

Backup adalah proses menyimpan data sistem...

:::demo BackupWizard

---

## Cara Backup

Langkah-langkah untuk backup data...
```

2. **Demo component** (opsional): `components/user-manual/demo-components/backup-wizard-demo.tsx`

3. **Register** di index + content maps

4. **Update `01-overview`**:
```markdown
| [Backup & Restore](?doc=08-backup-restore) | Panduan backup & restore |
```

---

## Debugging Tips

### Markdown tidak render

- Cek nama file: harus ada prefix number, slug, dan icon bracket
- Cek icon name exists di `iconMap` di `user-manual-content.tsx`
- Refresh browser (cache markdown di client)

### Demo component tidak muncul

- Cek sintaks: `:::demo ComponentName` (case-sensitive)
- Harus di baris sendiri (paragraph terpisah)
- Cek component sudah di-register di `demoComponentsMap`
- Cek console untuk error React

### Demo component error runtime

- Error "useRouter": Component pakai router hook, buat versi simplified
- Error "SidebarProvider": Wrap dengan `SidebarProvider`
- Error "has no handler": Component butuh prop `onRefresh`, `onClick`, dll

### Full viewport sidebar

Gunakan `collapsible="none"` pada Sidebar:

```tsx
<Sidebar collapsible="none" className="!w-full">
```

---

## Referensi

- **Remix Icons**: https://remixicon.com/
- **Remark GFM**: https://github.com/remarkjs/remark-gfm
- **Mermaid**: https://mermaid.js.org/
- **shadcn/ui sidebar**: `components/ui/sidebar.tsx`