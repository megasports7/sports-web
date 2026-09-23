'use client';

/**
 * Shared styles for the secretary event sections (split step 2). One copy
 * of the table/card/filter/action classes previously inline in EventDetail,
 * included by each section so every subpage looks identical.
 *
 * Global (not scoped): styled-jsx scoping would restrict these selectors
 * to this component's own tree, leaving the consuming section's table
 * unstyled. One global copy beats four duplicated scoped copies.
 */
export function SecretaryStyles() {
  return (
    <style jsx global>{`
      .card {
        background: var(--color-surface);
        border: 1px solid var(--color-line);
        border-radius: 14px;
        padding: 16px 18px;
      }
      .card h2 {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: #3a3d45;
        margin: 0 0 12px;
      }
      .filters {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
      }
      .filters button {
        border: 1px solid var(--color-line);
        border-radius: 999px;
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-muted);
        background: transparent;
        cursor: pointer;
        text-transform: capitalize;
      }
      .filters button.on {
        background: var(--color-ink);
        color: #fff;
        border-color: var(--color-ink);
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13.5px;
      }
      .data-table th {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--color-muted);
        text-align: left;
        padding: 6px 8px;
        border-bottom: 1.5px solid var(--color-line);
      }
      .data-table td {
        padding: 9px 8px;
        border-bottom: 1px solid var(--color-line);
        color: var(--color-ink);
      }
      .data-table tbody tr:last-child td {
        border-bottom: none;
      }
      .status {
        display: inline-block;
        border-radius: 999px;
        padding: 2px 10px;
        font-size: 12px;
        font-weight: 700;
      }
      .status-pending,
      .status-scheduled,
      .status-in_progress {
        background: #fef3c7;
        color: #92400e;
      }
      .status-approved,
      .status-overridden,
      .status-completed,
      .status-gold,
      .status-silver,
      .status-bronze {
        background: #dcfce7;
        color: #166534;
      }
      .status-rejected {
        background: #fee2e2;
        color: #991b1b;
      }
      .status-default {
        background: #f1f5f9;
        color: #475569;
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .actions button {
        border: 1px solid var(--color-line);
        border-radius: 8px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        background: var(--color-surface);
      }
      .actions button:disabled {
        opacity: 0.5;
      }
      .batch-create {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .batch-create input,
      .batch-create select {
        border: 1px solid var(--color-line);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 13px;
        background: var(--color-surface);
        color: var(--color-ink);
      }
      .batch-create button {
        border: 1px solid var(--color-line);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        background: var(--color-ink);
        color: #fff;
      }
      .batch-create button:disabled {
        opacity: 0.5;
      }
      .batch-group {
        margin-bottom: 14px;
      }
      .batch-group:last-child {
        margin-bottom: 0;
      }
      .batch-group h3 {
        font-size: 13px;
        font-weight: 800;
        margin: 0 0 8px;
        color: var(--color-ink);
      }
      .muted-count {
        color: var(--color-muted);
        font-weight: 600;
      }
      .versus {
        font-weight: 700;
      }
      .versus .vs {
        color: var(--color-muted);
        font-weight: 600;
        margin: 0 4px;
      }
      .winner {
        color: #166534;
      }
      .loser {
        color: var(--color-muted);
        font-size: 12px;
      }
    `}</style>
  );
}
