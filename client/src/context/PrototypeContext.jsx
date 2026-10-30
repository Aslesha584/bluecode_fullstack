
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";

import {
  apiRequest,
  AUTH_TOKEN_KEY,
  getWorkspace
} from "../api";

import {
  allInitialOutreach,
  allInitialProspects,
  initialActivities
} from "../data/mockData";

const PrototypeContext = createContext(null);
const STORAGE_KEY = "blueCodeOsWorkspaceV1";

const DEFAULT_FOUNDER_NAME = "Aslesha";

const defaultState = {
  account: {
    name: DEFAULT_FOUNDER_NAME,
    email: "founder@example.com"
  },

  startup: {
    companyName: "",
    product: "",
    geography: "India",
    customers: "",
    objective: "Book qualified discovery conversations",
    trialCompleted: true,
    completedBillingMonths: 1
  },

  icp: null,

  prospects: allInitialProspects,
  prospectDataMode: "demo",

  outreach: allInitialOutreach,
  activities: initialActivities,

  bookingUrl: "",
  selectedPlan: "Starter",
  accountCreated: false,
  selectedProspectId: "p1",
  setupComplete: false,
  icpApproved: false,

  discoveryStatus: "idle",
  discoveryError: ""
};

const createDefaultState = () => ({
  ...defaultState,

  account: {
    ...defaultState.account
  },

  startup: {
    ...defaultState.startup
  },

  prospects: allInitialProspects.map(item => ({ ...item })),

  prospectDataMode: "demo",

  outreach: allInitialOutreach.map(item => ({ ...item })),

  activities: [...initialActivities]
});

const normalizeFounderName = name => {
  const trimmedName =
    typeof name === "string" ? name.trim() : "";

  if (
    !trimmedName ||
    trimmedName.toLowerCase() === "aslesha1008"
  ) {
    return DEFAULT_FOUNDER_NAME;
  }

  return trimmedName;
};

const personalizeFounderName = (body, founderName) => {
  if (typeof body !== "string") return body;

  const safeName = normalizeFounderName(founderName);

  return body
    .replace(/\[Founder name\]/gi, safeName)
    .replace(/aslesha1008/gi, safeName);
};

const hydrateState = incoming => {
  const parsed =
    incoming && typeof incoming === "object"
      ? incoming
      : {};

  const loaded = {
    ...createDefaultState(),
    ...parsed,

    account: {
      ...defaultState.account,
      ...(parsed.account || {})
    },

    startup: {
      ...defaultState.startup,
      ...(parsed.startup || {})
    },

    prospects: Array.isArray(parsed.prospects)
      ? parsed.prospects
      : allInitialProspects.map(item => ({ ...item })),

    outreach: Array.isArray(parsed.outreach)
      ? parsed.outreach
      : allInitialOutreach.map(item => ({ ...item })),

    activities: Array.isArray(parsed.activities)
      ? parsed.activities
      : [...initialActivities],

    prospectDataMode:
      parsed.prospectDataMode === "live"
        ? "live"
        : "demo",

    discoveryStatus: parsed.discoveryStatus || "idle",
    discoveryError: parsed.discoveryError || ""
  };

  loaded.account.name = normalizeFounderName(
    loaded.account.name
  );

  loaded.outreach = loaded.outreach.map(item => ({
    ...item,
    body: personalizeFounderName(
      item.body,
      loaded.account.name
    )
  }));

  return loaded;
};

const addActivity = (
  activities,
  title,
  detail,
  kind = "mail"
) => [
  {
    id: Date.now(),
    title,
    detail,
    time: "Just now",
    kind
  },
  ...activities
];

// Convert a Hunter company result into the format
// already used by the existing Prospects UI.
const mapHunterCompany = (item, index) => {
  const organization =
    typeof item.organization === "string"
      ? item.organization
      : item.organization?.name;

  const company =
    organization ||
    item.company ||
    item.name ||
    "Unknown company";

  const rawDomain =
    item.domain ||
    item.organization?.domain ||
    item.website ||
    "";

  const domain = String(rawDomain)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  const website = domain
    ? `https://${domain}`
    : "";

  const location = [
    item.city,
    item.state,
    item.country
  ]
    .filter(Boolean)
    .join(", ");

  const normalizedCompany = String(company)
    .trim()
    .toLowerCase();

  const safeId = domain
    ? `hunter-${domain}`
    : `hunter-${normalizedCompany.replace(/[^a-z0-9]+/g, "-") || index}`;

  return {
    id: safeId,

    company,
    domain,
    website,

    industry:
      item.industry ||
      item.industries?.[0] ||
      "Unknown",

    location: location || "Unknown",

    size:
      item.headcount ||
      item.employee_count ||
      item.employees ||
      "Unknown",

    description: item.description || "",

    source: "Hunter",

    score: 0,
    icpFitScore: 0,
    priority: "Low",

    fit: [],

    trigger: {
      status: "Unknown",
      description: "No verified trigger evidence yet.",
      evidenceUrl: "",
      confidence: 0
    },

    mainSignal: {
      status: "Unknown",
      description: "No verified main signal yet.",
      evidenceUrl: "",
      confidence: 0
    },

    buyingSignal: "Unknown",
    signal: "Unknown",
    intent: "Unknown",

    evidence: [],

    evidenceGaps: [
      "Recent business trigger not verified",
      "Buying intent not verified"
    ],

    status: "Target",

    person: "",
    role: "",
    email: "",

    hunterData: item
  };
};

const getCompanyKey = prospect => {
  const domain = String(prospect.domain || "")
    .trim()
    .toLowerCase();

  if (domain) return `domain:${domain}`;

  return `company:${String(prospect.company || "")
    .trim()
    .toLowerCase()}`;
};

export function PrototypeProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        return hydrateState(JSON.parse(saved));
      }
    } catch {
      // Fall back to initial demo data if saved data is invalid.
    }

    return createDefaultState();
  });

  const [backendReady, setBackendReady] = useState(false);

  const saveTimerRef = useRef(null);

  // Load authenticated workspace from the backend.
  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      return undefined;
    }

    let cancelled = false;

    getWorkspace()
      .then(({ state: workspaceState }) => {
        if (cancelled) return;

        setState(hydrateState(workspaceState));
        setBackendReady(true);
      })
      .catch(error => {
        if (cancelled) return;

        if (error.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }

        setBackendReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Save workspace state locally.
  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch {
      // Continue if browser storage is unavailable.
    }
  }, [state]);

  // Save workspace state to MongoDB through the backend.
  useEffect(() => {
    if (
      !backendReady ||
      !localStorage.getItem(AUTH_TOKEN_KEY)
    ) {
      return undefined;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      apiRequest("/workspace", {
        method: "PUT",
        body: JSON.stringify({ state })
      }).catch(error => {
        if (error.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setBackendReady(false);
        }
      });
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, backendReady]);

  const actions = useMemo(
    () => ({
      replaceWorkspace: workspaceState => {
        setState(hydrateState(workspaceState));
        setBackendReady(true);
      },

      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(STORAGE_KEY);

        setBackendReady(false);
        setState(createDefaultState());
      },

      updateAccount: account =>
        setState(s => {
          const updatedAccount = {
            ...s.account,
            ...account
          };

          const founderName = normalizeFounderName(
            updatedAccount.name
          );

          updatedAccount.name = founderName;

          return {
            ...s,
            account: updatedAccount,

            outreach: s.outreach.map(item => ({
              ...item,
              body: personalizeFounderName(
                item.body,
                founderName
              )
            }))
          };
        }),

      markAccountCreated: () =>
        setState(s => ({
          ...s,
          accountCreated: true
        })),

      selectPlan: selectedPlan =>
        setState(s => ({
          ...s,
          selectedPlan
        })),

      updateStartup: startup =>
        setState(s => ({
          ...s,
          startup: {
            ...s.startup,
            ...startup
          }
        })),

      saveStartup: startup =>
        setState(s => ({
          ...s,
          startup: {
            ...s.startup,
            ...startup
          },
          setupComplete: true
        })),

      saveIcp: icp =>
        setState(s => ({
          ...s,
          icp,
          icpApproved: false
        })),

      approveIcp: () =>
        setState(s => ({
          ...s,
          icpApproved: true,

          activities: addActivity(
            s.activities,
            "ICP approved",
            "Your approved ICP is now used for company discovery.",
            "check"
          )
        })),

      // Discover real companies using the approved ICP.
      discoverProspects: async () => {
        const currentIcp = state.icp;
        const currentStartup = state.startup;
        const approved = state.icpApproved;

        if (!currentIcp || !approved) {
          const message =
            "Please approve your ICP before discovering companies.";

          setState(s => ({
            ...s,
            discoveryStatus: "error",
            discoveryError: message
          }));

          throw new Error(message);
        }

        setState(s => ({
          ...s,
          discoveryStatus: "loading",
          discoveryError: ""
        }));

        try {
          const industries = Array.isArray(currentIcp.industries)
            ? currentIcp.industries.filter(
                item => item && item !== "Other"
              )
            : [];

          const geography =
            currentIcp.geography ||
            currentStartup.geography ||
            "India";

          const companySize =
            currentIcp.size || "11–200 employees";

          const buyerRoles = Array.isArray(currentIcp.roles)
            ? currentIcp.roles.filter(Boolean)
            : [];

          const product = String(
            currentStartup.product || ""
          ).trim();

          const painPoints = String(
            currentIcp.painPoints || ""
          ).trim();

          const exclusions = String(
            currentIcp.exclusions || ""
          ).trim();

          // Build a descriptive natural-language query
          // using the approved ICP.
          const queryParts = [
            industries.length
              ? `Companies operating in the ${industries.join(" and ")} industries`
              : "B2B companies",

            `headquartered in ${geography}`,

            `with approximately ${companySize}`,

            product
              ? `that could benefit from solutions like ${product}`
              : "",

            painPoints
              ? `with business challenges including ${painPoints}`
              : "",

            buyerRoles.length
              ? `where relevant decision makers include ${buyerRoles.join(", ")}`
              : "",

            exclusions
              ? `Exclude companies matching these descriptions: ${exclusions}`
              : ""
          ].filter(Boolean);

          const query = queryParts.join(". ") + ".";

          console.log("Hunter discovery query:", query);

          const response = await apiRequest(
            "/hunter/discover",
            {
              method: "POST",
              body: JSON.stringify({
                query,
                limit: 10
              })
            }
          );

          const companies = Array.isArray(response.companies)
            ? response.companies
            : [];

          if (companies.length === 0) {
            throw new Error(
              "Hunter returned no matching companies. Try refining your industry, geography, or company size."
            );
          }

          const mapped = companies.map(mapHunterCompany);

          setState(s => {
            // Retain existing live records after repeat discovery.
            // Start clean when replacing demo records.
            const existing =
              s.prospectDataMode === "live"
                ? s.prospects
                : [];

            const merged = [...existing];

            const knownKeys = new Set(
              existing.map(getCompanyKey)
            );

            mapped.forEach(prospect => {
              const key = getCompanyKey(prospect);

              if (!key || knownKeys.has(key)) return;

              merged.push(prospect);
              knownKeys.add(key);
            });

            return {
              ...s,

              prospects: merged,
              prospectDataMode: "live",

              discoveryStatus: "completed",
              discoveryError: "",

              selectedProspectId:
                merged[0]?.id || "",

              activities: addActivity(
                s.activities,
                "Company discovery completed",
                `${mapped.length} companies returned by Hunter. ${merged.length} unique companies saved.`,
                "check"
              )
            };
          });

          return mapped;

        } catch (error) {
          setState(s => ({
            ...s,
            discoveryStatus: "error",
            discoveryError:
              error.message ||
              "Company discovery failed."
          }));

          throw error;
        }
      },

      selectProspect: id =>
        setState(s => ({
          ...s,
          selectedProspectId: id
        })),

      updateProspectStatus: (id, status) =>
        setState(s => ({
          ...s,

          prospects: s.prospects.map(p =>
            p.id === id
              ? {
                  ...p,
                  status,
                  stageAgeDays: 0
                }
              : p
          )
        })),

      updateReplyIntent: (outreachId, intent) =>
        setState(s => {
          const item = s.outreach.find(
            o => o.id === outreachId
          );

          if (!item) return s;

          const normalizedIntent = String(intent).toLowerCase();

          const status =
            normalizedIntent === "positive"
              ? "Interested"
              : normalizedIntent === "negative"
                ? "Not interested"
                : "Contacted";

          return {
            ...s,

            outreach: s.outreach.map(o =>
              o.id === outreachId
                ? {
                    ...o,
                    intent,
                    replyReceived: true,
                    status: `Reply received - ${normalizedIntent}`
                  }
                : o
            ),

            prospects: s.prospects.map(p =>
              p.id === item.prospectId
                ? {
                    ...p,
                    intent,
                    replyIntent: intent,
                    replyReceived: true,
                    status
                  }
                : p
            ),

            activities: addActivity(
              s.activities,
              `${intent} reply recorded (demo)`,
              `Reply intent recorded for ${item.company}. No inbox is connected.`,
              "mail"
            )
          };
        }),

      updateOutreach: (id, changes) =>
        setState(s => ({
          ...s,

          outreach: s.outreach.map(o =>
            o.id === id
              ? {
                  ...o,
                  ...changes
                }
              : o
          ),

          activities: changes.status
            ? addActivity(
                s.activities,
                changes.status,
                `Demo workflow updated for ${
                  s.outreach.find(o => o.id === id)?.company ||
                  "prospect"
                }.`,
                "mail"
              )
            : s.activities
        })),

      handoffOutreach: id =>
        setState(s => ({
          ...s,

          outreach: s.outreach.map(o =>
            o.id === id
              ? {
                  ...o,
                  status: "Queued for review (demo)"
                }
              : o
          ),

          activities: addActivity(
            s.activities,
            "Outreach approval preview",
            `${
              s.outreach.find(o => o.id === id)?.company ||
              "Prospect"
            } queued locally. No email was sent.`,
            "mail"
          )
        })),

      createOutreachForProspects: ids =>
        setState(s => {
          const selected = s.prospects.filter(
            p =>
              ids.includes(p.id) &&
              !s.outreach.some(o => o.prospectId === p.id)
          );

          const founderName = normalizeFounderName(
            s.account?.name
          );

          const drafts = selected.map((p, i) => ({
            id: `o${Date.now()}${i}`,
            prospectId: p.id,
            company: p.company,
            person: p.person,

            subject: `A question about ${
              (p.industry || "your industry").toLowerCase()
            } workflows at ${p.company}`,

            body: `Hi ${(p.person || "there").split(" ")[0]},\n\nI’m reaching out because ${p.company} operates in ${
              (p.industry || "your industry").toLowerCase()
            }. We help teams review repeatable workflows and identify where manual work may be reduced.\n\nIf this is relevant to your priorities, would a short conversation be useful? If not, no worries.\n\nBest,\n${founderName}`,

            status: "Needs review",
            step: "Initial email",
            intent: "Not received",
            followUps: []
          }));

          return {
            ...s,

            outreach: [
              ...drafts,
              ...s.outreach
            ],

            activities: drafts.length
              ? addActivity(
                  s.activities,
                  "Outreach drafts created",
                  `${drafts.length} selected prospect(s) added to the review queue.`,
                  "mail"
                )
              : s.activities
          };
        }),

      updateBookingUrl: bookingUrl =>
        setState(s => ({
          ...s,
          bookingUrl
        })),

      markBookingLinkSentDemo: id =>
        setState(s => {
          const item = s.outreach.find(
            o => o.id === id
          );

          if (!item) return s;

          const sentAt = new Date().toISOString();

          return {
            ...s,

            outreach: s.outreach.map(o =>
              o.id === id
                ? {
                    ...o,
                    bookingLinkSent: true,
                    bookingLinkSentAt: sentAt,
                    status: "Booking link sent (demo)"
                  }
                : o
            ),

            prospects: s.prospects.map(p =>
              p.id === item.prospectId
                ? {
                    ...p,
                    bookingLinkSent: true,
                    bookingLinkSentAt: sentAt,
                    status: "Booking link sent"
                  }
                : p
            ),

            activities: addActivity(
              s.activities,
              "Booking link recorded (demo)",
              `Booking link action recorded for ${item.company}. No real email was sent.`,
              "mail"
            )
          };
        }),

      markFollowUpSentDemo: prospectId =>
        setState(s => {
          const prospect = s.prospects.find(
            p => p.id === prospectId
          );

          if (!prospect) return s;

          const existing = Array.isArray(prospect.followUps)
            ? prospect.followUps
            : [];

          const count = Math.max(
            existing.length,
            Number(prospect.followUpCount) || 0,
            prospect.followUp2Sent
              ? 2
              : prospect.followUp1Sent
                ? 1
                : 0
          );

          const status = String(
            prospect.status || ""
          ).toLowerCase();

          const intent = String(
            prospect.replyIntent || prospect.intent || ""
          ).toLowerCase();

          const stopped =
            prospect.meetingBooked === true ||
            prospect.bookingLinkSent === true ||
            [
              "not interested",
              "rejected",
              "do not contact"
            ].includes(status) ||
            intent === "negative";

          if (stopped || count >= 2) return s;

          const number = count + 1;

          const followUp = {
            number,
            sentAt: new Date().toISOString(),
            demo: true
          };

          return {
            ...s,

            prospects: s.prospects.map(p =>
              p.id === prospectId
                ? {
                    ...p,
                    followUps: [...existing, followUp],
                    followUpCount: number,
                    followUp1Sent: number >= 1,
                    followUp2Sent: number >= 2,
                    status: `Follow-up ${number} recorded (demo)`
                  }
                : p
            ),

            outreach: s.outreach.map(o =>
              o.prospectId === prospectId
                ? {
                    ...o,
                    followUps: [
                      ...(Array.isArray(o.followUps)
                        ? o.followUps
                        : []),
                      followUp
                    ],
                    status: `Follow-up ${number} recorded (demo)`
                  }
                : o
            ),

            activities: addActivity(
              s.activities,
              `Follow-up ${number} recorded (demo)`,
              `Follow-up ${number} recorded for ${prospect.company}. No real email was sent.`,
              "mail"
            )
          };
        }),

      resetDemo: () => {
        localStorage.removeItem(STORAGE_KEY);

        setState(createDefaultState());
      }
    }),

    [state.icp, state.icpApproved, state.startup]
  );

  return (
    <PrototypeContext.Provider
      value={{
        ...state,
        ...actions
      }}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const context = useContext(PrototypeContext);

  if (!context) {
    throw new Error(
      "usePrototype must be used inside PrototypeProvider"
    );
  }

  return context;
}
