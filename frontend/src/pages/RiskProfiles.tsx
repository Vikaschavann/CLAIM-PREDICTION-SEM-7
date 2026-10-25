// Risk Profiles page – searchable, filterable, sortable table
import { useEffect, useState, useCallback } from 'react';
import { getRiskProfiles, type RiskProfileRow } from '../api/client';
import RiskBadge from '../components/RiskBadge';
import ToastContainer, { useToasts } from '../components/Toast';

const AGE_OPTS  = ['All ages', '16-25', '26-39', '40-64', '65+'];
const RISK_OPTS = ['All levels', 'Low', 'Medium', 'High'];

export default function RiskProfiles() {
  const [rows, setRows] = useState<RiskProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('All ages');
  const [riskFilter, setRiskFilter] = useState('All levels');
  const [sortKey, setSortKey] = useState<keyof RiskProfileRow>('risk_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { toasts, addToast, dismiss } = useToasts();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 200,
        offset: 0,
        ...(riskFilter !== 'All levels' && { risk_level: riskFilter }),
        ...(ageFilter !== 'All ages' && { age: ageFilter }),
        ...(search && { search }),
      };
      const r = await getRiskProfiles(params);
      setRows(r.data);
      setPage(0);
    } catch {
      addToast('Failed to load risk profiles', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, ageFilter, riskFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (k: keyof RiskProfileRow) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const Th = ({ col, label }: { col: keyof RiskProfileRow; label: string }) => (
    <th
      className="cursor-pointer select-none"
      onClick={() => handleSort(col)}
      aria-sort={sortKey === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === col && (
          <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Risk Profiles</h1>
        <p className="page-subtitle">Segment and explore policyholders by risk level</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="form-label" htmlFor="search-input">Search</label>
          <input
            id="search-input"
            type="search"
            className="form-input"
            placeholder="Policy ID, age, income…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="age-filter">Age band</label>
          <select id="age-filter" className="form-select w-36" value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
            {AGE_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="risk-filter">Risk level</label>
          <select id="risk-filter" className="form-select w-36" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            {RISK_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="text-sm text-text-muted self-end pb-2.5">
          {loading ? 'Loading…' : `${sorted.length.toLocaleString()} results`}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" aria-label="Risk profiles table">
            <thead>
              <tr>
                <Th col="policy_id" label="Policy ID" />
                <Th col="age" label="Age" />
                <Th col="driving_experience" label="Experience" />
                <Th col="income" label="Income" />
                <Th col="risk_score" label="Risk Score" />
                <th>Risk Level</th>
                <Th col="probability" label="Probability" />
                <th>Top Factor</th>
                <th>Prediction</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
                : paginated.map(row => (
                  <tr key={row.policy_id}>
                    <td className="font-mono text-xs font-semibold">{row.policy_id}</td>
                    <td>{row.age}</td>
                    <td>{row.driving_experience}</td>
                    <td className="text-text-secondary capitalize">{row.income}</td>
                    <td>
                      <span className="font-bold text-text-primary">{row.risk_score}</span>
                    </td>
                    <td><RiskBadge level={row.risk_level} label={row.risk_level} /></td>
                    <td>{(row.probability * 100).toFixed(1)}%</td>
                    <td className="text-text-secondary text-xs">{row.top_factor}</td>
                    <td>
                      <span className={row.prediction === 'Yes' ? 'risk-badge-high' : 'risk-badge-low'}>
                        {row.prediction === 'Yes' ? 'Claim likely' : 'No claim'}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-card-border">
            <button
              className="btn-secondary text-xs py-1.5 px-3"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </button>
            <span className="text-sm text-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="btn-secondary text-xs py-1.5 px-3"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
