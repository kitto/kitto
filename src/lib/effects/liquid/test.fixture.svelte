<script lang="ts">
	import { Liquid, LiquidItem, type LiquidEffect } from './exports.js'

	let { effect = 'morph', x = 0, shadow }: { effect?: LiquidEffect; x?: number; shadow?: string } = $props()
</script>

<Liquid data-testid="group" {shadow}>
	<Liquid.Item {effect} {x}>
		<button>One</button>
	</Liquid.Item>
	<LiquidItem effect="morph" dissolve>
		<span>Two</span>
	</LiquidItem>
	<p>plain</p>
</Liquid>
