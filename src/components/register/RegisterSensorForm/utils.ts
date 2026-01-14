export function parseCustomDate(dateStr: string): Date {
    try {
        // Expected format: "18-Dec-2025,09:30:00" or similar or ISO
        if (dateStr.includes(",")) {
            const [datePart, timePart] = dateStr.split(",");
            const [day, monthStr, year] = datePart.split("-");
            const [hour, minute, second] = timePart.split(":");

            const months: Record<string, number> = {
                Jan: 0,
                Feb: 1,
                Mar: 2,
                Apr: 3,
                May: 4,
                Jun: 5,
                Jul: 6,
                Aug: 7,
                Sep: 8,
                Oct: 9,
                Nov: 10,
                Dec: 11,
            };

            return new Date(
                parseInt(year),
                months[monthStr] || 0,
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            );
        }
        return new Date(dateStr);
    } catch (e) {
        console.error("Error parsing date:", dateStr, e);
        return new Date();
    }
}

export function formatMotorStartTime(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${day}-${month}-${year},${hours}:${minutes}:${seconds}`;
}
