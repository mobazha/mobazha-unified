// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityCombobox } from '@/components/ui/entity-combobox';

const ITEMS = [
  { id: 'alpha-id', name: 'Alpha', detail: 'First item' },
  { id: 'beta-id', name: 'Beta', detail: 'Second item' },
];

describe('EntityCombobox', () => {
  it('searches custom entity fields and returns the selected value', () => {
    const onValueChange = vi.fn();
    render(
      <EntityCombobox
        items={ITEMS}
        onValueChange={onValueChange}
        getItemValue={item => item.id}
        getItemText={item => item.name}
        getItemSearchText={item => `${item.name} ${item.id} ${item.detail}`}
        renderItem={item => (
          <span>
            {item.name} <small>{item.detail}</small>
          </span>
        )}
        ariaLabel="Choose entity"
        searchPlaceholder="Search entities"
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Choose entity' }));
    const search = screen.getByRole('combobox', { name: 'Search entities' });
    fireEvent.change(search, { target: { value: 'beta-id' } });

    expect(screen.queryByRole('option', { name: /Alpha/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Beta Second item/ }));

    expect(onValueChange).toHaveBeenCalledWith('beta-id');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('supports arrow-key selection from the search field', () => {
    const onValueChange = vi.fn();
    render(
      <EntityCombobox
        items={ITEMS}
        onValueChange={onValueChange}
        getItemValue={item => item.id}
        getItemText={item => item.name}
        ariaLabel="Choose entity"
        searchPlaceholder="Search entities"
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Choose entity' }));
    const search = screen.getByRole('combobox', { name: 'Search entities' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('beta-id');
  });
});
