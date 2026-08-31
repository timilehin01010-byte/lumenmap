import { NextResponse } from "next/server";
import { BigQueryLimitExceededError } from "@/lib/hubble/errors";
import { getTimeseriesData, getFixtureTimeseriesResponse, type TimeseriesGranularity } from "@/lib/hubble/timeseries-data";
import { resolveDataSource } from "@/lib/data-source";
import { isValidPeriod, PERIOD_OPTIONS } from "@/lib/periods";
import type { ApiErrorResponse, Period } from "@/lib/types";
import {
  createCorrelationId,
  endTimer,
  logError,
  logInfo,
  startTimer,
} from "@/lib/log";

export type TimeseriesFetcher = (
  period: Period,
  granularity: TimeseriesGranularity | null,
) => ReturnType<typeof getTimeseriesData>;

const SUPPORTED_PERIODS = PERIOD_OPTIONS.map((period) => period.value);

export function parseTimeseriesGranularity(
  value: string | null,
): { ok: true; granularity: TimeseriesGranularity | null } | { ok: false; body: ApiErrorResponse; status: 400 } {
  if (value === null) {
    return { ok: true, granularity: null };
  }

  if (value === "hour" || value === "day") {
    return { ok: true, granularity: value };
  }

  return {
    ok: false,
    body: {
      code: "INVALID_GRANULARITY",
      message: "Unsupported timeseries granularity.",
    },
    status: 400,
  };
}

export function parseTimeseriesPeriod(periodParam: string | null):
  | { ok: true; period: Period }
  | { ok: false; body: ApiErrorResponse; status: 400 } {
  if (periodParam === null) {
    return { ok: true, period: "1d" };
  }

  if (!isValidPeriod(periodParam)) {
    return {
      ok: false,
      body: {
        code: "INVALID_PERIOD",
        message: "Unsupported activity period.",
        supported: SUPPORTED_PERIODS,
      },
      status: 400,
    };
  }

  return { ok: true, period: periodParam };
}

export async function handleTimeseriesRequest(
  request: Request,
  fetchTimeseries: TimeseriesFetcher = getTimeseriesData,
) {
  const correlationId = createCorrelationId();
  const timer = startTimer();
  const { searchParams } = new URL(request.url);
  const parsedPeriod = parseTimeseriesPeriod(searchParams.get("period"));
  const parsedGranularity = parseTimeseriesGranularity(
    searchParams.get("granularity"),
  );

  if (!parsedPeriod.ok) {
    return NextResponse.json(parsedPeriod.body, { status: parsedPeriod.status });
  }

  if (!parsedGranularity.ok) {
    return NextResponse.json(parsedGranularity.body, {
      status: parsedGranularity.status,
    });
  }

  logInfo({
    event: "timeseries.request.start",
    correlationId,
    period: parsedPeriod.period,
  });

  let dataSourceMode: "live" | "fixture" = "live";
  try {
    dataSourceMode = resolveDataSource();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError({
      event: "timeseries.request.error",
      correlationId,
      period: parsedPeriod.period,
      durationMs: endTimer(timer),
      errorClass: "validation",
      errorMessage: message,
    });
    return NextResponse.json(
      { code: "INVALID_DATA_SOURCE", message },
      { status: 400 },
    );
  }

  if (fetchTimeseries === getTimeseriesData && dataSourceMode === "fixture") {
    const data = getFixtureTimeseriesResponse(parsedPeriod.period);
    logInfo({
      event: "timeseries.request.complete",
      correlationId,
      period: parsedPeriod.period,
      durationMs: endTimer(timer),
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=900, s-maxage=900" },
    });
  }

  try {
    const data = await fetchTimeseries(
      parsedPeriod.period,
      parsedGranularity.granularity,
    );

    logInfo({
      event: "timeseries.request.complete",
      correlationId,
      period: parsedPeriod.period,
      durationMs: endTimer(timer),
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=900, s-maxage=900" },
    });
  } catch (error) {
    if (error instanceof BigQueryLimitExceededError) {
      logError({
        event: "timeseries.request.error",
        correlationId,
        period: parsedPeriod.period,
        durationMs: endTimer(timer),
        errorClass: "provider",
        errorMessage: error.message,
      });
      return NextResponse.json(
        {
          code: "LIMIT_EXCEEDED",
          message: error.message,
        } satisfies ApiErrorResponse,
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch timeseries data";
    logError({
      event: "timeseries.request.error",
      correlationId,
      period: parsedPeriod.period,
      durationMs: endTimer(timer),
      errorClass: "provider",
      errorMessage: message,
    });

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      } satisfies ApiErrorResponse,
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleTimeseriesRequest(request);
}
