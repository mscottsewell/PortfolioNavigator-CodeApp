/* ── Period Selector ── */

import { Dropdown, Option, makeStyles, Text } from '@fluentui/react-components';
import { CalendarMonthRegular } from '@fluentui/react-icons';
import type { IAllocationPeriod } from '../../types';
import { isCurrentPeriod } from '../../utils';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
});

interface PeriodSelectorProps {
  periods: IAllocationPeriod[];
  selectedPeriodId: string | null;
  onSelect: (periodId: string) => void;
  disabled?: boolean;
}

export function PeriodSelector({
  periods,
  selectedPeriodId,
  onSelect,
  disabled,
}: PeriodSelectorProps) {
  const styles = useStyles();

  const selectedPeriod = periods.find((period) => period.cai_allocationperiodid === selectedPeriodId);

  return (
    <div className={styles.container}>
      <CalendarMonthRegular fontSize={20} />
      <Text size={300} weight="semibold">Period:</Text>
      <Dropdown
        value={selectedPeriod
          ? `${selectedPeriod.cai_periodname}${isCurrentPeriod(selectedPeriod) ? ' (Current)' : ''}`
          : ''}
        selectedOptions={selectedPeriodId ? [selectedPeriodId] : []}
        onOptionSelect={(_e, data) => {
          if (data.optionValue) onSelect(data.optionValue);
        }}
        disabled={disabled}
        style={{ minWidth: '200px' }}
      >
        {periods.map((period) => {
          const label = `${period.cai_periodname}${isCurrentPeriod(period) ? ' (Current)' : ''}`;
          return (
            <Option
              key={period.cai_allocationperiodid}
              value={period.cai_allocationperiodid}
              text={label}
            >
              {label}
            </Option>
          );
        })}
      </Dropdown>
    </div>
  );
}
