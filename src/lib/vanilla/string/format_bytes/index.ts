/**
 * @module format_bytes
 * @group Vanilla
 * @version 1.0.0
 * @remarks Uses decimal units (1KB = 1,000 bytes), choosing the largest unit up to TB
 * before rounding up to a whole number. Values below 1,000 bytes use B.
 *
 * @param bytes - A finite, non-negative byte count.
 * @returns The rounded size followed by B, KB, MB, GB, or TB without a space.
 * @throws RangeError if bytes is negative or non-finite.
 *
 * @example
 * format_bytes(350889) // '351KB'
 * format_bytes(1500000) // '2MB'
 * format_bytes(0) // '0B'
 */
export function format_bytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) {
		throw new RangeError('format_bytes: bytes must be a finite, non-negative number.')
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB']
	let unit = 0
	let divisor = 1

	while (unit < units.length - 1 && bytes >= divisor * 1000) {
		divisor *= 1000
		unit++
	}

	return `${Math.ceil(bytes / divisor)}${units[unit]}`
}
