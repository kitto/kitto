import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

const layer = '.overlay:has(> .image)'
const image = `${layer} > .image`
const controls = '.controls:has(> .tool)'
const dimensions = () => ({
	width: document.documentElement.scrollWidth,
	height: document.documentElement.scrollHeight
})

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 650 })
	await page.route(/\/(desktop|tablet|mobile)\.png$/, route =>
		route.fulfill({
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="20000"><rect width="1024" height="20000" fill="blue"/></svg>'
		})
	)
	await page.goto('/')
	await page.getByRole('button', { name: /Overlay/ }).waitFor()
	// Exercise a positioned body, margins, and native horizontal overflow as well as vertical scrolling.
	await page.addStyleTag({
		content:
			'body { position: relative; margin: 24px; padding: 12px } body > div:not(.controls):not(.overlay) { display: none !important }'
	})
	await page.evaluate(() => {
		const fixture = document.createElement('section')
		fixture.id = 'scroll-fixture'
		fixture.style.cssText = 'height:4000px;width:1400px'
		document.body.append(fixture)
	})
	await page.getByRole('button', { name: /Overlay/ }).click()
})

test('image stays in document coordinates throughout scrolling; controls stay fixed', async ({ page }) => {
	const original = await page.evaluate(dimensions)
	await page.evaluate(() => window.scrollTo(100, 800))
	await page.getByRole('switch').click()
	await expect(page.locator(image)).toBeVisible()
	await page.getByRole('spinbutton', { name: 'X Offset' }).fill('17')
	await page.getByRole('spinbutton', { name: 'Y Offset' }).fill('23')
	const panel = await page.locator(controls).boundingBox()
	await expect.poll(() => page.evaluate(dimensions)).toEqual(original)

	// Sample every animation frame while the browser scrolls, rather than only after scroll events settle.
	await page.evaluate(
		({ image, controls }) => {
			const samples: number[] = []
			Object.assign(window, { overlayScrollSamples: samples, overlayScrollFrame: 0 })
			const sample = () => {
				const rect = document.querySelector(image)!.getBoundingClientRect()
				const panel = document.querySelector(controls)!.getBoundingClientRect()
				const expectedX = (document.documentElement.clientWidth - rect.width) / 2 + 17
				samples.push(Math.abs(rect.top + scrollY - 23), Math.abs(rect.left + scrollX - expectedX), panel.top)
				Object.assign(window, { overlayScrollFrame: requestAnimationFrame(sample) })
			}
			sample()
		},
		{ image, controls }
	)
	await page.mouse.move(200, 200)
	for (const [dx, dy] of [
		[0, 40],
		[120, 600],
		[-80, -350],
		[0, 1000],
		[0, -800]
	]) {
		await page.mouse.wheel(dx, dy)
		await page.waitForTimeout(150)
	}
	await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'smooth' }))
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(1800)
	const samples = await page.evaluate(() => {
		const state = window as typeof window & { overlayScrollFrame: number; overlayScrollSamples: number[] }
		cancelAnimationFrame(state.overlayScrollFrame)
		return state.overlayScrollSamples
	})
	expect(samples.length).toBeGreaterThan(9)
	for (let i = 0; i < samples.length; i += 3) {
		expect(samples[i]).toBeLessThanOrEqual(1)
		expect(samples[i + 1]).toBeLessThanOrEqual(1)
		expect(Math.abs(samples[i + 2] - panel!.y)).toBeLessThanOrEqual(1)
	}
	await expect(page.locator(image)).toHaveCSS('translate', 'calc(-50% + 17px) 23px')
	await expect.poll(() => page.evaluate(dimensions)).toEqual(original)
})

test('clipping follows page growth and shrinkage without changing its scrollable size', async ({ page }) => {
	const original = await page.evaluate(dimensions)
	await page.getByRole('switch').click()
	await expect(page.locator(image)).toBeVisible()
	await page.getByRole('spinbutton', { name: 'Y Offset' }).fill('50000')
	await expect.poll(() => page.evaluate(dimensions)).toEqual(original)
	for (const height of [6000, 1000]) {
		await page.locator('#scroll-fixture').evaluate((node, height) => (node.style.height = `${height}px`), height)
		await expect
			.poll(() => page.locator(layer).evaluate(node => node.getBoundingClientRect().height))
			.toBe(height + 72)
		const enabled = await page.evaluate(dimensions)
		await page.getByRole('switch').click()
		expect(await page.evaluate(dimensions)).toEqual(enabled)
		await page.getByRole('switch').click()
	}
	await page.getByRole('combobox', { name: 'Source', exact: true }).selectOption('1920')
	await page.setViewportSize({ width: 393, height: 650 })
	await expect.poll(() => page.locator(layer).evaluate(node => node.getBoundingClientRect().width)).toBe(393)
	const enabled = await page.evaluate(dimensions)
	await page.getByRole('switch').click()
	expect(await page.evaluate(dimensions)).toEqual(enabled)
})

test('restores image alignment when reloading partway down the page', async ({ page }) => {
	await page.getByRole('switch').click()
	await page.getByRole('spinbutton', { name: 'Y Offset' }).fill('42')
	await page.evaluate(() => window.scrollTo(0, 800))
	await page.reload()
	await expect(page.locator(image)).toBeVisible()
	await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
	await expect
		.poll(() => page.locator(image).evaluate(node => node.getBoundingClientRect().top + scrollY))
		.toBe(42)
	const enabled = await page.evaluate(dimensions)
	await page.getByRole('switch').click()
	expect(await page.evaluate(dimensions)).toEqual(enabled)
})
