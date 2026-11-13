"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Lesson = {
  id: string;
  date: string;
  period: number;
  startTime?: string;
  endTime?: string;
  courseTitle: string;
  room: string;
};

type Period = {
  period: number;
  startTime?: string;
  endTime?: string;
};

function getMonday(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default function TimetablePage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const selectedWeekStart = weekStart;
    const weekEnd = addDays(selectedWeekStart, 6);

    async function loadTimetable() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          from: toDateKey(selectedWeekStart),
          to: toDateKey(weekEnd),
        });
        const response = await fetch(`/api/timetable?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("時間割の取得に失敗しました。");
        }
        if (!response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("時間割を取得できませんでした。ログイン状態を確認してください。");
        }

        setLessons((await response.json()) as Lesson[]);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "時間割の取得に失敗しました。",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTimetable();
    return () => controller.abort();
  }, [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const periods = useMemo(() => {
    const periodMap = new Map<number, Period>();
    for (const lesson of lessons) {
      if (!periodMap.has(lesson.period)) {
        periodMap.set(lesson.period, {
          period: lesson.period,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        });
      }
    }
    return Array.from(periodMap.values()).sort((a, b) => a.period - b.period);
  }, [lessons]);
  const weekEnd = addDays(weekStart, 6);
  const todayKey = toDateKey(new Date());

  function moveWeek(amount: number) {
    setWeekStart((current) => addDays(current, amount * 7));
  }

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>時間割</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => moveWeek(-1)} style={buttonStyle}>
            前の週
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            style={buttonStyle}
          >
            今週
          </button>
          <button type="button" onClick={() => moveWeek(1)} style={buttonStyle}>
            次の週
          </button>
        </div>
        <p aria-live="polite" style={{ fontWeight: 600 }}>
          {`${weekStart.getFullYear()}年 ${formatDate(weekStart)} - ${formatDate(weekEnd)}`}
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </p>
      )}
      {loading && <p role="status">時間割を読み込み中...</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12 }}>
          <table
            style={{
              width: "100%",
              minWidth: 900,
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                <th style={headerCellStyle}>時限</th>
                {days.map((day, index) => {
                  const key = toDateKey(day);
                  return (
                    <th
                      key={key}
                      style={{
                        ...headerCellStyle,
                        color: index === 5 ? "#2563eb" : index === 6 ? "#dc2626" : undefined,
                        background: key === todayKey ? "#eff6ff" : "#f8fafc",
                      }}
                    >
                      <span>{["月", "火", "水", "木", "金", "土", "日"][index]}</span>
                      <br />
                      <span>{formatDate(day)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...cellStyle, textAlign: "center", padding: 32 }}>
                    この週に授業はありません。
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.period}>
                    <th scope="row" style={headerCellStyle}>
                      <div>第{period.period}時限</div>
                      {period.startTime && period.endTime && (
                        <small style={{ color: "#64748b", fontWeight: 400 }}>
                          {period.startTime} - {period.endTime}
                        </small>
                      )}
                    </th>
                    {days.map((day) => {
                      const dayKey = toDateKey(day);
                      const dayLessons = lessons.filter(
                        (lesson) =>
                          lesson.date.slice(0, 10) === dayKey &&
                          lesson.period === period.period,
                      );
                      return (
                        <td
                          key={dayKey}
                          style={{
                            ...cellStyle,
                            background: dayKey === todayKey ? "#f8fbff" : "#fff",
                            verticalAlign: "top",
                          }}
                        >
                          {dayLessons.map((lesson) => (
                            <article
                              key={lesson.id}
                              style={{
                                padding: 10,
                                borderRadius: 8,
                                background: "#eff6ff",
                                borderLeft: "3px solid #2563eb",
                                marginBottom: 6,
                              }}
                            >
                              <p style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                                {lesson.courseTitle}
                              </p>
                              <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                                {lesson.room}
                              </p>
                            </article>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const buttonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#1e293b",
  cursor: "pointer",
};

const headerCellStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #e2e8f0",
  textAlign: "center",
  background: "#f8fafc",
  fontWeight: 600,
};

const cellStyle: CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  textAlign: "left",
};
