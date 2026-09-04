import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { TodoWithCategory } from '@/api/todos';
import { TodoItem } from '@/features/todos/components/todo-item';
import { asDateString } from '@/utils/dates';

// Link needs a navigation context we do not want to build for a unit test.
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

const todo = (overrides: Partial<TodoWithCategory> = {}): TodoWithCategory =>
  ({
    id: 'todo-1',
    user_id: 'user-1',
    title: 'Buy milk',
    description: null,
    completed: false,
    priority: 'medium',
    due_date: null,
    category_id: null,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    categories: null,
    ...overrides,
  }) as TodoWithCategory;

describe('TodoItem', () => {
  it('renders the title', async () => {
    await render(<TodoItem todo={todo()} onToggle={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Buy milk')).toBeTruthy();
  });

  it('calls onToggle with the todo when the checkbox is pressed', async () => {
    const onToggle = jest.fn();
    const item = todo();
    await render(<TodoItem todo={item} onToggle={onToggle} onDelete={jest.fn()} />);

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith(item);
  });

  it('reports completion state to assistive tech', async () => {
    await render(
      <TodoItem todo={todo({ completed: true })} onToggle={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('calls onDelete with the whole row, which the cache patch needs', async () => {
    const onDelete = jest.fn();
    const row = todo();
    await render(<TodoItem todo={row} onToggle={jest.fn()} onDelete={onDelete} />);

    fireEvent.press(screen.getByLabelText('Delete "Buy milk"'));

    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it('states priority, category and due date in words, not only colour', async () => {
    // The dots are colour-coded. A screen reader gets nothing from colour, so
    // the label has to carry the same information.
    await render(
      <TodoItem
        todo={todo({
          priority: 'high',
          due_date: asDateString('2020-01-01'),
          categories: { id: 'c1', name: 'Work', color: '#EF4444' },
        })}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    // Both the checkbox and the row mention the title; the row is the one
    // that ends in "Open details."
    const label = screen.getByLabelText(/Open details/).props.accessibilityLabel as string;
    expect(label).toContain('high priority');
    expect(label).toContain('in Work');
    expect(label).toContain('overdue');
  });
});
