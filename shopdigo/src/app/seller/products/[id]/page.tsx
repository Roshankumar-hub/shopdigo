'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/client/api';
import { Field, Loading, PageTitle } from '@/components/ui';
import ProductImage from '@/components/ProductImage';

const MAX_PHOTOS = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const blank = { name: '', category_id: '', brand_id: '', description: '', mrp: '', price: '', stock: '', images: [] as string[], cod_available: true, delivery_days: '', return_window_days: '7', specs: '', submit: true };

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const [f, setF] = useState<any>(blank);
  const [cats, setCats] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const meta = await api<any>('catalog.search', {});
      setCats(meta.categories.filter((c: any) => c.parent_id));
      setBrands(meta.brands);
      if (!isNew) {
        const list = await api<any[]>('seller.products');
        const p = list.find(x => x.id === id);
        if (!p) { toast.error('Product not found'); router.push('/seller/products'); return; }
        setF({
          name: p.name, category_id: p.category_id, brand_id: p.brand_id || '', description: p.description,
          mrp: String(p.mrp), price: String(p.price), stock: String(p.stock), images: (p.images || []).map((i: any) => i.url),
          cod_available: p.cod_available, delivery_days: String(p.delivery_days), return_window_days: String(p.return_window_days),
          specs: Object.entries(p.specifications || {}).map(([k, v]) => `${k}: ${v}`).join('\n'), submit: p.status !== 'draft',
        });
      }
      setLoaded(true);
    })().catch(e => toast.error(e.message));
  }, [id, isNew, router]);

  const validate = (submitting: boolean) => {
    const e: string[] = [];
    if (f.name.trim().length < 3) e.push('Product name needs at least 3 characters');
    if (!f.category_id) e.push('Choose a category');
    if (f.description.trim().length < 20) e.push('Description needs at least 20 characters');
    const mrp = Number(f.mrp), price = Number(f.price);
    if (!(mrp > 0)) e.push('MRP must be a positive number');
    if (!(price > 0)) e.push('Selling price must be a positive number');
    if (price > mrp) e.push('Selling price cannot be more than MRP');
    if (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) e.push('Stock must be a whole number, 0 or more');
    if (!(Number(f.delivery_days) >= 1 && Number(f.delivery_days) <= 30)) e.push('Enter the dispatch time in days (1 to 30). SHOPDIGO does not estimate it for you.');
    if (submitting && f.images.length === 0) e.push('Add at least one product photo before submitting for review (you can save a draft without photos)');
    if (f.images.length > MAX_PHOTOS) e.push(`Maximum ${MAX_PHOTOS} photos`);
    setErrs(e);
    return e.length === 0;
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - f.images.length;
    if (room <= 0) { toast.error(`You already have ${MAX_PHOTOS} photos. Remove one to add another.`); if (fileRef.current) fileRef.current.value = ''; return; }
    const picked = Array.from(files);
    if (picked.length > room) toast.error(`Only ${room} more photo${room === 1 ? '' : 's'} can be added (maximum ${MAX_PHOTOS}).`);
    setUploading(true);
    const added: string[] = [];
    for (const file of picked.slice(0, room)) {
      if (!TYPES.includes(file.type)) { toast.error(`${file.name}: use a JPG, PNG or WebP image`); continue; }
      if (file.size > MAX_BYTES) { toast.error(`${file.name} is larger than 5 MB`); continue; }
      const body = new FormData();
      body.append('file', file);
      try {
        const res = await fetch('/api/upload/product-image', { method: 'POST', body, credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        added.push(json.data.url);
      } catch (err: any) { toast.error(`${file.name}: ${err.message}`); }
    }
    if (added.length) {
      setF((x: any) => ({ ...x, images: [...x.images, ...added] }));
      toast.success(`${added.length} photo${added.length === 1 ? '' : 's'} uploaded`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const moveImage = (i: number, dir: -1 | 1) => setF((x: any) => {
    const list = [...x.images]; const j = i + dir;
    if (j < 0 || j >= list.length) return x;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...x, images: list };
  });
  const removeImage = (i: number) => setF((x: any) => ({ ...x, images: x.images.filter((_: string, k: number) => k !== i) }));

  const save = async (submit: boolean) => {
    if (!validate(submit)) return;
    setBusy(true);
    try {
      const specifications = Object.fromEntries(f.specs.split('\n').map((l: string) => l.split(':')).filter((p: string[]) => p.length >= 2 && p[0].trim()).map(([k, ...v]: string[]) => [k.trim(), v.join(':').trim()]));
      await api('seller.productSave', {
        data: {
          ...(isNew ? {} : { id }), name: f.name.trim(), category_id: f.category_id, brand_id: f.brand_id || null, description: f.description.trim(),
          specifications, mrp: Number(f.mrp), price: Number(f.price), stock: Number(f.stock),
          images: f.images,
          cod_available: !!f.cod_available, delivery_days: Number(f.delivery_days), return_window_days: Number(f.return_window_days), submit,
        },
      });
      toast.success(submit ? 'Submitted for review' : 'Draft saved');
      router.push('/seller/products');
    } catch (e: any) { setErrs([e.message]); } finally { setBusy(false); }
  };

  if (!loaded) return <Loading />;
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const disc = Number(f.mrp) > 0 && Number(f.price) > 0 && Number(f.price) <= Number(f.mrp) ? Math.round(((Number(f.mrp) - Number(f.price)) / Number(f.mrp)) * 100) : 0;

  return (
    <div className="max-w-3xl">
      <PageTitle title={isNew ? 'Add a product' : 'Edit product'} subtitle="New listings and edits to name or description are reviewed by SHOPDIGO before going live." />
      <form onSubmit={e => { e.preventDefault(); save(true); }} noValidate className="space-y-5">
        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Product name *" id="pn"><input id="pn" className="input-field" maxLength={150} value={f.name} onChange={e => set('name', e.target.value)} /></Field></div>
          <Field label="Category *" id="cat"><select id="cat" className="input-field" value={f.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">Select</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></Field>
          <Field label="Brand" id="brand"><select id="brand" className="input-field" value={f.brand_id} onChange={e => set('brand_id', e.target.value)}>
            <option value="">No brand / generic</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></Field>
          <div className="md:col-span-2"><Field label="Description *" id="desc"><textarea id="desc" rows={4} maxLength={5000} className="input-field" value={f.description} onChange={e => set('description', e.target.value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Specifications (one per line, Key: Value)" id="specs"><textarea id="specs" rows={4} className="input-field font-mono text-sm" value={f.specs} onChange={e => set('specs', e.target.value)} placeholder={'Material: Cotton\nWarranty: 1 Year'} /></Field></div>
        </section>

        <section className="card grid gap-4 p-5 md:grid-cols-3">
          <h2 className="font-bold md:col-span-3">Pricing & inventory</h2>
          <Field label="MRP (₹) *" id="mrp"><input id="mrp" type="number" min={1} className="input-field" value={f.mrp} onChange={e => set('mrp', e.target.value)} /></Field>
          <Field label="Selling price (₹) *" id="price"><input id="price" type="number" min={1} className="input-field" value={f.price} onChange={e => set('price', e.target.value)} /></Field>
          <Field label="Stock units *" id="stock"><input id="stock" type="number" min={0} className="input-field" value={f.stock} onChange={e => set('stock', e.target.value)} /></Field>
          <p className="text-sm text-gray-700 md:col-span-3">Discount: <span className="font-semibold">{disc}%</span> (calculated from MRP and selling price)</p>
        </section>

        <section className="card grid gap-4 p-5 md:grid-cols-3">
          <h2 className="font-bold md:col-span-3">Delivery & returns</h2>
          <Field label="Dispatch time (days)" id="dd"><input id="dd" type="number" min={1} max={30} className="input-field" value={f.delivery_days} onChange={e => set('delivery_days', e.target.value)} /></Field>
          <Field label="Return window (days)" id="rw"><input id="rw" type="number" min={0} max={60} className="input-field" value={f.return_window_days} onChange={e => set('return_window_days', e.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.cod_available} onChange={e => set('cod_available', e.target.checked)} className="h-4 w-4" /> Cash on Delivery allowed</label>
        </section>

        <section className="card p-5" aria-labelledby="photos-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="photos-heading" className="font-bold">Product photos</h2>
              <p className="mt-1 text-sm text-gray-600">JPG, PNG or WebP, up to 5 MB each. Use a plain background and show the actual item. The first photo is the main image. {f.images.length}/{MAX_PHOTOS} added.</p>
            </div>
            <div>
              <input ref={fileRef} id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={e => uploadFiles(e.target.files)} disabled={uploading || f.images.length >= MAX_PHOTOS} />
              <label htmlFor="photo-file" className={`btn-outline cursor-pointer py-2 text-sm ${uploading || f.images.length >= MAX_PHOTOS ? 'pointer-events-none opacity-50' : ''}`}>
                <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" /> {uploading ? 'Uploading…' : 'Upload photos'}
              </label>
            </div>
          </div>
          {f.images.length === 0 ? (
            <div className="mt-4 flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-600">
              No photos yet. Upload at least one photo before submitting for review.
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Uploaded photos">
              {f.images.map((url: string, i: number) => (
                <li key={url} className="relative rounded-lg border border-gray-200 bg-white p-2">
                  <div className="aspect-[4/5] overflow-hidden rounded bg-gray-50"><ProductImage src={url} alt={`Photo ${i + 1} of ${f.name || 'product'}`} /></div>
                  {i === 0 && <span className="absolute left-3 top-3 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === f.images.length - 1} aria-label={`Move photo ${i + 1} later`} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"><ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                    <button type="button" onClick={() => removeImage(i)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"><XMarkIcon className="h-4 w-4" aria-hidden="true" /> Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {errs.length > 0 && <div role="alert" className="card border-red-300 bg-red-50 p-4 text-sm text-red-800">{errs.map(e => <div key={e}>• {e}</div>)}</div>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy || uploading} className="btn-secondary px-6">{busy ? 'Saving…' : 'Submit for review'}</button>
          <button type="button" disabled={busy || uploading} onClick={() => save(false)} className="btn-outline">Save as draft</button>
          <button type="button" onClick={() => router.push('/seller/products')} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
