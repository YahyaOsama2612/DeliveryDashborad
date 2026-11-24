import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Filter,
  RefreshCw,
  Truck,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import getErrorMessage from '../../lib/Geterrormessage';
import {
  extractDeliveryMen,
  getDeliveryManId,
  getDeliveryManName,
} from '../../lib/deliveryManUtils';

const SUMMARY_URL = '/api/shipping/reports/summary';
const COURIER_PERFORMANCE_URL = '/api/shipping/reports/courier-performance';
const DELIVERY_MEN_URL = '/api/shipping/delivery-men';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const humanize = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatValue = (value, hideIdentifiers = false) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item, hideIdentifiers)).join(', ');
  }
  if (isObject(value)) {
    return Object.entries(value)
      .filter(([key]) => !hideIdentifiers || !isIdentifierField(key))
      .map(([key, item]) => `${humanize(key)}: ${formatValue(item, hideIdentifiers)}`)
      .join(' · ');
  }
  return String(value);
};

const unwrapResponse = (response) => {
  let value = response;
  for (let depth = 0; depth < 2 && isObject(value) && 'data' in value; depth += 1) {
    value = value.data;
  }
  return value;
};

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0) ||
  (isObject(value) && Object.keys(value).length === 0);

const isIdentifierField = (field) =>
  field === 'id' ||
  field === '_id' ||
  field.endsWith('Id') ||
  field.endsWith('ID') ||
  field.endsWith('_id');

const courierNameFields = new Set([
  'name',
  'fullname',
  'couriername',
  'deliverymanname',
  'drivername',
  'courier',
  'deliveryman',
  'driver',
]);

const getCourierNameFromReport = (courier, index) => {
  const name =
    courier.courierName ||
    courier.courier_name ||
    courier.deliveryManName ||
    courier.delivery_man_name ||
    courier.driverName ||
    courier.driver_name ||
    courier.name ||
    courier.fullName ||
    courier.full_name ||
    courier.courier?.name ||
    courier.deliveryMan?.name ||
    courier.driver?.name ||
    courier.user?.name ||
    (typeof courier.courier === 'string' ? courier.courier : '') ||
    '';
  return String(name).trim() || `Courier ${index + 1}`;
};

const CourierPerformanceCards = ({ rows }) => (
  <div className="courier-performance-list">
    {rows.map((courier, index) => {
      const name = getCourierNameFromReport(courier, index);
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
      const metrics = Object.entries(courier).filter(([key, value]) => {
        const normalizedKey = key.replace(/[_-\s]/g, '').toLowerCase();
        return (
          !isIdentifierField(key) &&
          !courierNameFields.has(normalizedKey) &&
          value !== null &&
          value !== undefined
        );
      });

      return (
        <article className="courier-performance-card" key={courier.id ?? courier._id ?? index}>
          <div className="courier-performance-identity">
            <span className="courier-performance-avatar" aria-hidden="true">{initials || <Truck size={16} />}</span>
            <div className="min-w-0">
              <h3 title={name}>{name}</h3>
              <p>Courier performance</p>
            </div>
            <Truck className="courier-performance-mark" size={18} aria-hidden="true" />
          </div>
          {metrics.length > 0 ? (
            <dl className="courier-performance-metrics">
              {metrics.map(([key, value]) => (
                <div key={key}>
                  <dt>{humanize(key)}</dt>
                  <dd>{formatValue(value, true)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="report-empty">No performance details returned.</p>
          )}
        </article>
      );
    })}
  </div>
);

const ReportTable = ({ rows }) => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  if (!columns.length) {
    return <p className="text-sm text-muted-foreground">No report rows returned.</p>;
  }

  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{humanize(column)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? row._id ?? rowIndex}>
              {columns.map((column) => (
                <td key={column}>{formatValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReportNode = ({ value, depth = 0, variant }) => {
  if (Array.isArray(value)) {
    if (!value.length) {
      return <p className="text-sm text-muted-foreground">No report rows returned.</p>;
    }

    if (variant === 'courier-performance') {
      const courierRows = value.filter(isObject);
      return courierRows.length ? (
        <CourierPerformanceCards rows={courierRows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No courier performance rows returned.
        </p>
      );
    }

    if (value.every(isObject)) {
      return <ReportTable rows={value} />;
    }

    return (
      <div className="report-value-list">
        {value.map((item, index) => (
          <span className="report-value-chip" key={`${index}-${formatValue(item)}`}>
            {formatValue(item)}
          </span>
        ))}
      </div>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    if (depth >= 3) {
      return (
        <p className="report-nested-value">
          {formatValue(value, variant === 'courier-performance')}
        </p>
      );
    }

    const scalarEntries = entries.filter(
      ([key, item]) =>
        !isObject(item) &&
        !Array.isArray(item) &&
        !(variant === 'courier-performance' && isIdentifierField(key)),
    );
    const nestedEntries = entries.filter(
      ([key, item]) =>
        (variant !== 'courier-performance' || !isIdentifierField(key)) &&
        (isObject(item) || Array.isArray(item)),
    );

    return (
      <div className="space-y-4">
        {scalarEntries.length > 0 && (
          <dl className="report-metric-grid">
            {scalarEntries.map(([key, item]) => (
              <div className="report-metric-card" key={key}>
                <dt>{humanize(key)}</dt>
                <dd>{formatValue(item, variant === 'courier-performance')}</dd>
              </div>
            ))}
          </dl>
        )}
        {nestedEntries.map(([key, item]) => (
          <section className="report-group" key={key}>
            <h3>{humanize(key)}</h3>
            <ReportNode value={item} depth={depth + 1} variant={variant} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <dl className="report-metric-grid">
      <div className="report-metric-card">
        <dt>Result</dt>
        <dd>{formatValue(value)}</dd>
      </div>
    </dl>
  );
};

const ReportPanel = ({ title, description, icon: Icon, response, loading, error, variant }) => {
  const payload = unwrapResponse(response);

  return (
    <section className="report-panel">
      <header className="report-panel-heading">
        <span className="report-panel-icon"><Icon size={19} /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="report-panel-content">
        {loading ? (
          <div className="report-loading" role="status">
            <RefreshCw className="size-4 animate-spin" />
            Loading report…
          </div>
        ) : error ? (
          <p role="alert" className="report-error">
            <AlertCircle size={16} />
            Could not load {title.toLowerCase()}: {getErrorMessage(error)}
          </p>
        ) : isEmpty(payload) ? (
          <p className="report-empty">No report data for the selected filters.</p>
        ) : (
          <ReportNode value={payload} variant={variant} />
        )}
      </div>
    </section>
  );
};

const Reports = () => {
  const [draftFilters, setDraftFilters] = useState({
    fromDate: '',
    toDate: '',
    courierId: '',
  });
  const [filters, setFilters] = useState({});
  const [filterError, setFilterError] = useState('');
  const {
    data: deliveryMenData,
    loading: deliveryMenLoading,
    error: deliveryMenError,
  } = useGet(DELIVERY_MEN_URL);
  const deliveryMen = useMemo(
    () => extractDeliveryMen(deliveryMenData),
    [deliveryMenData],
  );
  const couriers = useMemo(() => {
    const options = deliveryMen
      .map((deliveryMan) => ({
        id: getDeliveryManId(deliveryMan),
        name: getDeliveryManName(deliveryMan).trim(),
        phone: deliveryMan?.phone || '',
      }))
      .filter(
        ({ id, name }) =>
          id !== null &&
          id !== undefined &&
          String(id).trim() !== '' &&
          name !== '',
      );
    const nameCounts = options.reduce((counts, courier) => {
      const key = courier.name.toLocaleLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());

    const duplicateIndices = new Map();
    return options
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((courier) => {
        const key = courier.name.toLocaleLowerCase();
        const duplicateIndex = (duplicateIndices.get(key) || 0) + 1;
        duplicateIndices.set(key, duplicateIndex);
        const isDuplicate = nameCounts.get(key) > 1;
        return {
          ...courier,
          label: isDuplicate
            ? courier.phone
              ? `${courier.name} · ${courier.phone}`
              : `${courier.name} (${duplicateIndex})`
            : courier.name,
        };
      });
  }, [deliveryMen]);
  const summaryQuery = useGet(SUMMARY_URL, filters);
  const performanceQuery = useGet(COURIER_PERFORMANCE_URL, filters);
  const isRefreshing = summaryQuery.loading || performanceQuery.loading;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setFilterError('The start date must be on or before the end date.');
      return;
    }

    setFilterError('');
    setFilters(
      Object.fromEntries(
        Object.entries(draftFilters)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value)
      )
    );
  };

  const clearFilters = () => {
    setDraftFilters({ fromDate: '', toDate: '', courierId: '' });
    setFilterError('');
    setFilters({});
  };

  const refreshReports = () => {
    summaryQuery.refetch();
    performanceQuery.refetch();
  };

  return (
    <section className="reports-page mx-auto max-w-7xl">
      <div className="reports-page-heading">
        <span className="reports-eyebrow"><BarChart3 size={14} /> DELIVERY INSIGHTS</span>
        <h1>Reports &amp; performance</h1>
        <p>Explore delivery summaries and courier performance using your selected filters.</p>
      </div>

      <form className="reports-filter-card" onSubmit={handleSubmit}>
        <div className="reports-filter-heading">
          <span className="reports-filter-icon"><Filter size={17} /></span>
          <div>
            <h2>Filter reports</h2>
            <p>All filters are optional.</p>
          </div>
        </div>
        <div className="reports-filter-fields">
          <label>
            <span>From date</span>
            <span className="reports-input-wrap">
              <CalendarDays size={16} aria-hidden="true" />
              <input
                type="date"
                value={draftFilters.fromDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))}
              />
            </span>
          </label>
          <label>
            <span>To date</span>
            <span className="reports-input-wrap">
              <CalendarDays size={16} aria-hidden="true" />
              <input
                type="date"
                value={draftFilters.toDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))}
              />
            </span>
          </label>
          <label>
            <span>Courier</span>
            <span className="reports-input-wrap">
              <Truck size={16} aria-hidden="true" />
              <select
                aria-label="Courier"
                value={draftFilters.courierId}
                disabled={deliveryMenLoading || Boolean(deliveryMenError) || !couriers.length}
                onChange={(event) => setDraftFilters((current) => ({ ...current, courierId: event.target.value }))}
              >
                <option value="">
                  {deliveryMenLoading
                    ? 'Loading couriers…'
                    : deliveryMenError
                      ? 'Couriers unavailable'
                      : 'All couriers'}
                </option>
                {couriers.map((courier) => (
                  <option key={String(courier.id)} value={String(courier.id)}>
                    {courier.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="reports-select-chevron" size={15} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="reports-filter-footer">
          {filterError && <p role="alert" className="reports-filter-error">{filterError}</p>}
          {deliveryMenError && (
            <p role="alert" className="reports-filter-error">
              Could not load couriers: {getErrorMessage(deliveryMenError)}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button type="button" className="reports-clear-button" onClick={clearFilters}>
              Clear
            </button>
            <button type="submit" className="reports-apply-button">
              <Filter size={15} />
              Apply filters
            </button>
          </div>
        </div>
      </form>

      <div className="reports-section-heading">
        <div>
          <h2>Report results</h2>
          <p>Use refresh to fetch the latest data from the reports API.</p>
        </div>
        <button
          type="button"
          className="reports-refresh-button"
          onClick={refreshReports}
          disabled={isRefreshing}
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="reports-grid">
        <ReportPanel
          title="Summary report"
          description="Delivery overview for the selected period."
          icon={BarChart3}
          response={summaryQuery.data}
          loading={summaryQuery.loading}
          error={summaryQuery.error}
        />
        <ReportPanel
          title="Courier performance"
          description="Performance details for your courier fleet."
          icon={Truck}
          variant="courier-performance"
          response={performanceQuery.data}
          loading={performanceQuery.loading}
          error={performanceQuery.error}
        />
      </div>
    </section>
  );
};

export default Reports;
