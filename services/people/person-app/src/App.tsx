import { type FormEvent, useEffect, useState } from 'react';

interface Person {
  _id: string;
  name: string;
  email: string;
  age?: number;
}

// Traefik serves this page on app.<project>.localhost/person-app and the API on
// api.<project>.localhost/api/person, so swap the host prefix. Other hostnames
// (person-app.localhost, localhost) fall back to this project's API host.
function apiUrl(): string {
  const { protocol, host, port } = window.location;
  const apiHost = host.startsWith('app.')
    ? `api.${host.slice('app.'.length)}`
    : `api.flisk-person-crud-example.localhost${port ? `:${port}` : ''}`;
  return `${protocol}//${apiHost}/api/person`;
}

const API_URL = import.meta.env.VITE_PERSON_API_URL ?? apiUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const emptyForm = { name: '', email: '', age: '' };

function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    request<Person[]>('/persons')
      .then(setPersons)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const body = JSON.stringify({
      name: form.name,
      email: form.email,
      ...(form.age === '' ? {} : { age: Number(form.age) }),
    });
    try {
      if (editingId) {
        await request(`/persons/${editingId}`, { method: 'PUT', body });
      } else {
        await request('/persons', { method: 'POST', body });
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const edit = (person: Person) => {
    setEditingId(person._id);
    setForm({ name: person.name, email: person.email, age: person.age?.toString() ?? '' });
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await request(`/persons/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>People</h1>
      <p style={{ color: '#666' }}>
        React + Express + MongoDB + Redis + RabbitMQ, started with <code>flisk up people</code>.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Age (optional)"
          type="number"
          min={0}
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit">{editingId ? 'Save' : 'Add person'}</button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      {persons.length === 0 ? (
        <p>No people yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {persons.map((person) => (
            <li
              key={person._id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}
            >
              <span>
                <strong>{person.name}</strong> · {person.email}
                {person.age !== undefined && ` · ${person.age}`}
              </span>
              <span style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => edit(person)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(person._id)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;
