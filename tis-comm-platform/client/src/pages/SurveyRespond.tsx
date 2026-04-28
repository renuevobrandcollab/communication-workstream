import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { api } from '../services/api';

export default function SurveyRespond() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<{ id: string; type: string; siteName: string } | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [q1, setQ1] = useState(0);
  const [q2, setQ2] = useState(0);
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/surveys/${id}/respond`)
      .then((r) => setSurvey(r.data.survey))
      .catch((err) => setError(err.response?.data?.error || 'Survey not found'));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/surveys/${id}/respond`, {
        q1Score: q1, q2Score: q2, q3Text: q3, q4Volume: q4, q5Score: q5,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-8 text-center text-danger">{error}</div>;
  if (!survey) return <div className="p-8 text-center">Loading…</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grey-light p-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-pgm mb-2">Thank you!</h1>
          <p className="text-sm text-grey">Your feedback has been submitted.</p>
        </div>
      </div>
    );
  }

  const titleMap: Record<string, string> = {
    POST_KICKOFF: 'Post Kick-off Survey',
    POST_UAT: 'Post UAT Survey',
    T_PLUS_30: 'Post Go-Live Survey — 30 days',
  };

  return (
    <div className="min-h-screen bg-grey-light p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="text-xs text-grey uppercase">TIS D365</div>
          <h1 className="text-xl font-bold text-dark">{titleMap[survey.type] || survey.type}</h1>
          <div className="text-sm text-grey">{survey.siteName}</div>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <Question text="Did you receive the information you needed at the right time?">
            <Stars value={q1} onChange={setQ1} />
          </Question>
          <Question text="Was the information clear and easy to understand?">
            <Stars value={q2} onChange={setQ2} />
          </Question>
          <Question text="Was there anything important you were not told?">
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={3} value={q3} onChange={(e) => setQ3(e.target.value)} />
          </Question>
          <Question text="Was the volume of communication...">
            <div className="flex flex-col gap-1.5 text-sm">
              {['Too little', 'About right', 'Too much'].map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="q4" value={v} checked={q4 === v} onChange={(e) => setQ4(e.target.value)} required />
                  {v}
                </label>
              ))}
            </div>
          </Question>
          <Question text="Overall, how would you rate the communication?">
            <Stars value={q5} onChange={setQ5} />
          </Question>
          <button type="submit" disabled={busy || !q1 || !q2 || !q5 || !q4} className="w-full bg-prj text-white rounded px-4 py-2 font-medium disabled:opacity-50">
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Question({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-medium text-sm mb-2">{text}</div>
      {children}
    </div>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={26} className={n <= value ? 'fill-amber-text text-amber-text' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  );
}
