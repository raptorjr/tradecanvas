import { describe, it, expect } from 'vitest';
import type { Theme, TradingPosition } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { PositionRenderer } from '../PositionRenderer.js';
import { TradingManager } from '../TradingManager.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
// Entry in view; the stop below the plot (y 150 of a 100 px plot), as when price runs away from it.
const position: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 60, quantity: 1, stopLoss: -50, takeProfit: 80 };

describe('PositionRenderer', () => {
  it('draws no stop priced off the plot, so none paints over the time axis or a pane', () => {
    const { ctx, texts } = recordingCtx();
    new PositionRenderer().render(ctx, [position], 70, unitViewport, theme, {});
    expect(texts).toContain('TP');
    expect(texts).not.toContain('SL');
  });

  it('puts no entry badge on the price axis for an entry out of the plot', () => {
    const { ctx, texts } = recordingCtx();
    const r = new PositionRenderer();
    const bare = { id: 'p1', side: 'buy' as const, entryPrice: 500, quantity: 1 };
    r.renderAxisBadges(ctx, [bare], unitViewport, theme, {});
    expect(texts).toEqual([]);
    r.renderAxisBadges(ctx, [{ ...bare, entryPrice: 60 }], unitViewport, theme, {});
    expect(texts).toEqual(['60.00']);
  });
});

describe('TradingManager and the plot', () => {
  it('draws everything clipped to the plot', () => {
    const manager = new TradingManager();
    manager.setPositions([position]);
    manager.setCurrentPrice(70);
    const { ctx, calls } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    const names = calls.map((c) => c.name);
    const clipAt = names.indexOf('clip');
    expect(calls.slice(0, clipAt).reverse().find((c) => c.name === 'rect')?.args).toEqual([0, 0, 1000, 100]);
    expect(calls.findIndex((c) => c.name === 'fillText')).toBeGreaterThan(clipAt);
    expect(names.at(-1)).toBe('restore');
  });

  it('lifts the clip even when a label callback throws', () => {
    const manager = new TradingManager();
    manager.setConfig({ positionLabel: () => { throw new Error('bad label'); } });
    manager.setPositions([position]);
    manager.setCurrentPrice(70);
    const { ctx, calls } = recordingCtx();
    expect(() => manager.render(ctx, unitViewport, theme)).toThrow('bad label');
    const names = calls.map((c) => c.name);
    expect(names.filter((n) => n === 'save').length).toBe(names.filter((n) => n === 'restore').length);
  });

  it('offers no drag on a stop or an order priced off the plot', () => {
    const manager = new TradingManager();
    manager.setPositions([position]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: -30, quantity: 1 }]);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    // Both lines map below the 100 px plot: the stop to y 150, the order to y 130.
    for (const y of [150, 130]) {
      expect(manager.isOverDraggableLine({ x: 500, y }, unitViewport)).toBe(false);
      expect(manager.onPointerDown({ x: 500, y }, unitViewport)).toBe(false);
    }
    // The take-profit, in view, still drags.
    expect(manager.isOverDraggableLine({ x: 500, y: 20 }, unitViewport)).toBe(true);
  });
});

describe('Futures position labels', () => {
  it('shows the same dollar multiplier for entry, SL and TP, including while dragging', () => {
    const renderer = new PositionRenderer();
    const cfg = { enabled: true, pricePrecision: 2 };
    const nq: TradingPosition = { id: 'nq', side: 'buy', entryPrice: 50, quantity: 1, pointValue: 20, currencySymbol: '$', stopLoss: 30, takeProfit: 74 };
    const labels = (pos: TradingPosition, current: number, drag: Parameters<PositionRenderer['tags']>[4] = null) =>
      renderer.tags([pos], current, unitViewport, cfg, drag).flatMap(tag => tag.cells.map(cell => cell.kind === 'text' ? cell.text : ''));
    expect(labels(nq, 55)).toEqual(expect.arrayContaining(['+$100.00', '-$400.00', '+$480.00']));
    expect(labels(nq, 55, { orderId: 'nq', sourceType: 'takeProfit', startPrice: 74, currentPrice: 75 })).toContain('+$500.00');
    expect(labels({ ...nq, side: 'sell', quantity: 3, closedQuantity: 1, stopLoss: 60, takeProfit: 40, pointValue: 2 }, 45))
      .toEqual(expect.arrayContaining(['+$20.00', '-$40.00', '+$40.00']));
    expect(labels({ ...nq, stopLoss: 50 }, 55)).toContain('$0.00');
    expect(labels({ ...nq, pointValue: undefined, currencySymbol: undefined }, 55)).toContain('+24.00');
  });
});
