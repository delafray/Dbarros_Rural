import React from 'react';
import { probBgColor, probTextColor } from '../../utils/probabilidadeCores';

export const PROBS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function ProbBadge({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="inline-flex items-center justify-center font-black text-[10px] rounded-full px-2 py-0.5 min-w-[40px] bg-slate-100 text-slate-400">
                —
            </span>
        );
    }
    const bg = probBgColor[value] ?? '#eee';
    const color = probTextColor[value] ?? '#333';
    return (
        <span
            className="inline-flex items-center justify-center font-black text-[10px] rounded-full px-2 py-0.5 min-w-[40px]"
            style={{ background: bg, color }}
        >
            {value}
        </span>
    );
}
