import { LAUNCH_DATE } from "@/lib/site";

const QUERY_URL = "https://api.databuddy.cc/v1/query";

const SUMMARY = "summary_metrics";

export type Pageviews = {
  lastMonth: number | null;
  sinceLaunch: number | null;
};

type RangeId = keyof Pageviews;

const EMPTY: Pageviews = { lastMonth: null, sinceLaunch: null };

type QueryResult = {
  queryId?: string;
  data?: { parameter: string; data?: { pageviews?: number }[] }[];
};

function batch(today: string) {
  return [
    {
      id: "lastMonth" satisfies RangeId,
      parameters: [SUMMARY],
      preset: "last_30d",
    },
    {
      id: "sinceLaunch" satisfies RangeId,
      parameters: [SUMMARY],
      startDate: LAUNCH_DATE,
      endDate: today,
    },
  ];
}

// a batch response is unordered, each entry echoes back the id it was sent with
function readPageviews(results: QueryResult[], id: RangeId) {
  const row = results
    .find((result) => result.queryId === id)
    ?.data?.find((entry) => entry.parameter === SUMMARY)?.data?.[0];
  return typeof row?.pageviews === "number" ? row.pageviews : null;
}

export async function fetchPageviews(): Promise<Pageviews> {
  const apiKey = process.env.DATABUDDY_API_KEY;
  const websiteId = process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID;
  if (!apiKey || !websiteId) return EMPTY;

  try {
    const res = await fetch(`${QUERY_URL}?website_id=${websiteId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(batch(new Date().toISOString().slice(0, 10))),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return EMPTY;

    const body = await res.json();
    if (!body?.success) return EMPTY;

    const results = (body.results ?? []) as QueryResult[];
    return {
      lastMonth: readPageviews(results, "lastMonth"),
      sinceLaunch: readPageviews(results, "sinceLaunch"),
    };
  } catch {
    return EMPTY;
  }
}
