/**
 * Nepal Standard Time utility.
 * NST = UTC+5:45 (note the unusual 45-minute offset).
 */

export function getNSTDate() {
  const now = new Date();
  // NST offset: 5 hours 45 minutes = 345 minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nstMs = utcMs + 345 * 60000;
  return new Date(nstMs);
}

export function formatNSTTime(date) {
  const nst = date || getNSTDate();
  const hours = String(nst.getHours()).padStart(2, '0');
  const minutes = String(nst.getMinutes()).padStart(2, '0');
  const seconds = String(nst.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} NST`;
}

export function formatNSTDate(date) {
  const nst = date || getNSTDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const day = nst.getDate();
  const month = months[nst.getMonth()];
  const year = nst.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatNSTDateTime(date) {
  return `${formatNSTDate(date)} | ${formatNSTTime(date)}`;
}
