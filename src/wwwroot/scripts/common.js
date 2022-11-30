export function formatTimeStamp(timestamp) {
    if (timestamp.toDate === undefined) {
        timestamp = Timestamp.now();
    }
    // Nov. 25th 2022 at HH:MM:SS
    const options = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" };
    return timestamp.toDate().toLocaleDateString('en-us', options);
}