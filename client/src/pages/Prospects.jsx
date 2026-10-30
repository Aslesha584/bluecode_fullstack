
import {
  ArrowDownUp,
  ArrowRight,
  Building2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePrototype } from "../context/PrototypeContext";
import { PageHeader } from "../components/UI";

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const getCompany = (p) =>
  firstValue(p.company, p.name, p.organization, p.hunterData?.organization, p.domain, "Unnamed company");

const getIndustry = (p) =>
  firstValue(
    p.industry,
    p.sector,
    p.category,
    p.hunterData?.industry,
    p.hunterData?.sector,
    "Industry not available"
  );

const getLocation = (p) => {
  const raw = p.hunterData || {};

  return firstValue(
    p.location,
    p.headquarters,
    p.headquarters_location,
    [p.city, p.state, p.country].filter(Boolean).join(", "),
    [raw.city, raw.state, raw.country].filter(Boolean).join(", "),
    raw.location,
    raw.headquarters,
    "Location not available"
  );
};

const getSize = (p) =>
  firstValue(
    p.size,
    p.employeeRange,
    p.headcount,
    p.employee_count,
    p.employees,
    p.hunterData?.headcount,
    p.hunterData?.employee_count,
    "Size not available"
  );

const getScore = (p) =>
  Number(p.score ?? p.icpFitScore ?? p.icpMatchScore ?? 0);

const isEvaluated = (p) =>
  p.icpEvaluated === true ||
  p.evaluationStatus === "completed" ||
  p.icpEvaluation != null ||
  Number(p.score ?? p.icpFitScore ?? p.icpMatchScore ?? 0) > 0;

const getPriority = (score) => {
  if (score >= 90) return "Hot";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Low";
};

export default function Prospects() {
  const { prospects = [] } = usePrototype();

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");

  const filteredProspects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...prospects]
      .filter((p) => {
        const searchable = [
          getCompany(p),
          getIndustry(p),
          getLocation(p),
          p.domain,
          p.website,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !normalizedSearch || searchable.includes(normalizedSearch);

        const matchesPriority =
          priority === "All" ||
          (isEvaluated(p) && getPriority(getScore(p)) === priority);

        return matchesSearch && matchesPriority;
      })
      .sort((a, b) => {
        const difference = getScore(a) - getScore(b);
        return sortOrder === "desc" ? -difference : difference;
      });
  }, [prospects, search, priority, sortOrder]);

  const toggleSort = () => {
    setSortOrder((current) => (current === "desc" ? "asc" : "desc"));
  };

  return (
    <div className="prospects-page">
      <PageHeader
        title="Prospects"
        description="Search and research companies that match your ideal customer profile."
      />

      <div className="prospects-toolbar">
        <div className="prospects-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search companies, industries, or locations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search prospects"
          />
        </div>

        <div className="prospects-filter">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            aria-label="Filter prospects by priority"
          >
            <option value="All">All priorities</option>
            <option value="Hot">Hot</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <button
          type="button"
          className="button button-secondary prospects-sort"
          onClick={toggleSort}
        >
          <ArrowDownUp size={16} aria-hidden="true" />
          ICP Fit: {sortOrder === "desc" ? "Highest first" : "Lowest first"}
        </button>
      </div>

      <div className="prospects-result-count">
        Showing <strong>{filteredProspects.length}</strong>{" "}
        {filteredProspects.length === 1 ? "company" : "companies"}
      </div>

      <div className="table-panel prospects-table-panel">
        <div className="table-scroll prospects-table-scroll">
          <table className="data-table prospects-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Location / Size</th>
                <th scope="col">ICP Fit</th>
                <th scope="col" className="prospects-action-heading">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProspects.map((prospect, index) => {
                const company = getCompany(prospect);
                const industry = getIndustry(prospect);
                const location = getLocation(prospect);
                const size = getSize(prospect);
                const score = getScore(prospect);
                const evaluated = isEvaluated(prospect);
                const prospectPriority = getPriority(score);

                return (
                  <tr key={prospect.id || prospect.domain || `${company}-${index}`}>
                    <td>
                      <div className="table-company prospects-company">
                        <div className="company-avatar">
                          <Building2 size={19} aria-hidden="true" />
                        </div>

                        <div className="table-main">
                          <span className="prospects-company-name">
                            {company}
                          </span>
                          <span className="table-sub">{industry}</span>
                          {prospect.domain && (
                            <span className="table-sub">{prospect.domain}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-main">
                        <span>{location}</span>
                        <span className="table-sub">
                          {typeof size === "number"
                            ? `${size.toLocaleString()} employees`
                            : size}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="prospects-fit">
                        <span className="prospects-fit-score">
                          {evaluated ? `${score}%` : "Pending"}
                        </span>

                        <span
                          className={`prospects-priority prospects-priority-${evaluated ? prospectPriority.toLowerCase() : "low"}`}
                        >
                          {evaluated ? prospectPriority : "Not evaluated"}
                        </span>
                      </div>
                    </td>

                    <td className="prospects-action-cell">
                      <Link
                        to={`/prospects/${prospect.id}`}
                        className="table-action"
                        aria-label={`View ${company} details`}
                        title={`View ${company} details`}
                      >
                        <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredProspects.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <Search size={24} aria-hidden="true" />
                      <p>No matching prospects found.</p>
                      <span>
                        Try another search or select a different priority.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
