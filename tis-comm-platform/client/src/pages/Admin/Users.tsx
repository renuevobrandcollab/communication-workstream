import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2 } from 'lucide-react';
import { api } from '../../services/api';
import type { User, Role, Site } from '../../types';
import TopBar from '../../components/Layout/TopBar';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Drawer } from '../../components/UI/Modal';
import { Field, inputClass } from '../../components/UI/FormField';

interface AdminUser extends User {
  sites: Array<{ siteId: string; siteCode: string; siteName: string; role: Role }>;
}

const ROLES: Role[] = ['ADMIN', 'PROGRAM_MANAGER', 'PROJECT_MANAGER', 'CHANGE_MANAGER', 'SOLUTION_ARCHITECT', 'PMO'];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<AdminUser | 'new' | null>(null);

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ users: AdminUser[] }>('/users')).data.users,
  });
  const sitesQ = useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get<{ sites: Site[] }>('/sites')).data.sites,
  });

  const save = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) await api.put(`/users/${data.id}`, data);
      else await api.post('/users', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDrawer(null);
    },
  });

  if (usersQ.isLoading) return <LoadingSpinner />;
  const users = usersQ.data || [];
  const sites = sitesQ.data || [];

  return (
    <div>
      <TopBar
        title="Admin · Users"
        right={
          <button onClick={() => setDrawer('new')} className="bg-prj text-white rounded px-3 py-1.5 text-sm flex items-center gap-1">
            <Plus size={14} /> Add user
          </button>
        }
      />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-grey-light text-grey uppercase text-xs">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Sites</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-grey">{u.email}</td>
                  <td className="px-3 py-2"><span className="text-xs bg-prj-lighter text-prj px-2 py-0.5 rounded">{u.role.replace(/_/g, ' ')}</span></td>
                  <td className="px-3 py-2 text-xs">{u.sites.map((s) => s.siteCode).join(', ') || '—'}</td>
                  <td className="px-3 py-2">{u.isActive ? <span className="text-xs bg-pgm-lighter text-pgm px-2 py-0.5 rounded">Active</span> : <span className="text-xs bg-grey-light text-grey px-2 py-0.5 rounded">Inactive</span>}</td>
                  <td className="px-3 py-2"><button onClick={() => setDrawer(u)} className="text-prj"><Edit2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Drawer open={drawer !== null} title={drawer === 'new' ? 'Add user' : 'Edit user'} onClose={() => setDrawer(null)}>
        {drawer && <UserForm initial={drawer === 'new' ? null : drawer} sites={sites} onSubmit={(d) => save.mutate(d)} busy={save.isPending} />}
      </Drawer>
    </div>
  );
}

function UserForm({ initial, sites, onSubmit, busy }: { initial: AdminUser | null; sites: Site[]; onSubmit: (d: any) => void; busy: boolean }) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initial?.role || 'PROJECT_MANAGER');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [siteIds, setSiteIds] = useState<string[]>(initial?.sites?.map((s) => s.siteId) || []);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: initial?.id, name, email, password, role, isActive, sites: siteIds.map((siteId) => ({ siteId, role })) }); }}>
      <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      <Field label={initial ? 'New password (leave blank to keep)' : 'Password'}>
        <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required={!initial} />
      </Field>
      <Field label="Role">
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Site assignments">
        <div className="space-y-1 max-h-40 overflow-auto border border-gray-200 rounded p-2">
          {sites.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={siteIds.includes(s.id)} onChange={(e) => setSiteIds(e.target.checked ? [...siteIds, s.id] : siteIds.filter((x) => x !== s.id))} />
              {s.code} — {s.name}
            </label>
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
