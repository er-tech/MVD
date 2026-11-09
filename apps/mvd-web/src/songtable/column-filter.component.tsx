import { IconButton, Menu, Portal } from '@chakra-ui/react'

/** One choice of a column filter: the value the column holds and the words shown for it. */
export interface FilterOption {
  value: string
  label: string
}

interface ColumnFilterProps {
  /** The name of the column, for the label of the button. */
  title:    string
  options:  readonly FilterOption[]
  /** The values that pass the filter; none means every row passes. */
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

/**
 * The filter of one column: a button in the header that opens a menu with a checkbox for each value of the column.
 * The button is filled while the filter holds back some rows.
 *
 * @param props - see {@link ColumnFilterProps}.
 */
export function ColumnFilter ({ title, options, selected, onChange }: ColumnFilterProps) {
  const active = selected.length > 0

  return (
    <Menu.Root closeOnSelect={false}>
      <Menu.Trigger asChild>
        <IconButton
          size='2xs'
          variant={active ? 'solid' : 'ghost'}
          aria-label={`Filter ${title}`}
          onClick={event => {
            event.stopPropagation()
          }}
        >
          ▾
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW='44'>
            {options.map(option => (
              <Menu.CheckboxItem
                key={option.value}
                value={option.value}
                checked={selected.includes(option.value)}
                onCheckedChange={checked => {
                  onChange(checked ? [...selected, option.value] : selected.filter(value => value !== option.value))
                }}
              >
                <Menu.ItemIndicator />
                {option.label}
              </Menu.CheckboxItem>
            ))}
            <Menu.Separator />
            <Menu.Item
              value='clear'
              disabled={!active}
              onSelect={() => {
                onChange([])
              }}
            >
              Show all
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
