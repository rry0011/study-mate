import { getTimetable } from "@/src/lib/timetable";

function parseDate(value: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
        ? null
        : date;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    if (!from || !to || from > to) {
        return Response.json(
            { error: "有効な開始日と終了日を指定してください。" },
            { status: 400 },
        );
    }

    return Response.json(await getTimetable(from, to));
}