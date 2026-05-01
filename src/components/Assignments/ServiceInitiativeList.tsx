/* ── Service List Panel (grouped by Allocation Area → Team) ── */

import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  makeStyles,
  tokens,
  Dropdown,
  Input,
  Option,
  ToggleButton,
} from '@fluentui/react-components';
import {
  SearchRegular,
  People20Regular,
  Briefcase20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import type { IServiceOrInitiative, IAssignment, IServiceInitiativeSummary, IResource } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { formatCount } from '../../utils';
import { EmptyState } from '../Shared';
import { ServiceInitiativeCard } from './ServiceInitiativeCard';
import { buildEffectiveServiceMetrics } from './serviceMetrics';

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '520px',
    minWidth: '400px',
    flexShrink: 0,
  },
  viewToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px 0',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 16px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  areaHeader: {
    padding: '8px 12px 2px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorBrandForeground1,
  },
  teamHeader: {
    padding: '2px 12px 2px 12px',
    fontSize: '11px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
  },
  serviceIndent: {
    paddingLeft: '12px',
  },
});

interface ServiceInitiativeListProps {
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  assignments: IAssignment[];
  resources: IResource[];
  serviceSummaries?: Map<string, IServiceInitiativeSummary>;
  selectedId: string | null;
  onSelectionChange: (id: string | null) => void;
  viewMode: 'employees' | 'services';
  onViewModeChange: (mode: 'employees' | 'services') => void;
  invalidCount: number;
  onIssuesFilterChange: (active: boolean) => void;
}

export function ServiceInitiativeList({
  serviceInitiatives,
  hierarchy,
  assignments,
  resources,
  serviceSummaries,
  selectedId,
  onSelectionChange,
  viewMode,
  onViewModeChange,
  invalidCount,
  onIssuesFilterChange,
}: ServiceInitiativeListProps) {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('__all__');

  const effectiveServices = useMemo(
    () => buildEffectiveServiceMetrics(serviceInitiatives, assignments, resources, serviceSummaries),
    [serviceInitiatives, assignments, resources, serviceSummaries],
  );

  const metricsByServiceId = useMemo(
    () => new Map(effectiveServices.map((service) => [service.id, service])),
    [effectiveServices],
  );

  const activeSIs = useMemo(
    () => new Set(effectiveServices.map((service) => service.id)),
    [effectiveServices],
  );

  const activeCount = activeSIs.size;

  const maxPct = useMemo(() => {
    let max = 0;
    for (const service of effectiveServices) {
      if (service.totalPercentage > max) max = service.totalPercentage;
    }
    return max;
  }, [effectiveServices]);

  const activeHierarchy = useMemo(() => {
    return hierarchy
      .map((areaNode) => ({
        ...areaNode,
        teams: areaNode.teams
          .map((teamNode) => ({
            ...teamNode,
            services: teamNode.services.filter((service) => metricsByServiceId.has(service.cai_serviceorinitiativeid)),
          }))
          .filter((teamNode) => teamNode.services.length > 0),
      }))
      .filter((areaNode) => areaNode.teams.length > 0);
  }, [hierarchy, metricsByServiceId]);

  const areaOptions = useMemo(() => {
    return activeHierarchy
      .map((areaNode) => areaNode.areaName)
      .sort((a, b) => a.localeCompare(b));
  }, [activeHierarchy]);

  const filteredActiveHierarchy = useMemo(() => {
    if (selectedArea === '__all__') {
      return activeHierarchy;
    }
    return activeHierarchy.filter((areaNode) => areaNode.areaName === selectedArea);
  }, [activeHierarchy, selectedArea]);

  const filteredCount = useMemo(() => {
    return filteredActiveHierarchy.reduce(
      (total, areaNode) => total + areaNode.teams.reduce((teamTotal, teamNode) => teamTotal + teamNode.services.length, 0),
      0,
    );
  }, [filteredActiveHierarchy]);

  const isSearching = search.trim().length > 0;

  // Enhanced search: match service names OR area/team names (showing all children when area/team matches)
  const searchHierarchy = useMemo(() => {
    if (!isSearching) return null;
    const query = search.toLowerCase();

    return filteredActiveHierarchy
      .map((areaNode) => {
        const areaMatches = areaNode.areaName.toLowerCase().includes(query);

        const matchedTeams = areaNode.teams
          .map((teamNode) => {
            const teamMatches = teamNode.team.cai_areaname.toLowerCase().includes(query);
              const matchedServices = teamNode.services.filter((service) => {
                if (areaMatches || teamMatches) return true;
               return [service.cai_name, service._cai_area_value_formatted, areaNode.areaName, teamNode.team.cai_areaname]
                 .filter(Boolean)
                 .join(' ')
                 .toLowerCase()
                 .includes(query);
              });
            return matchedServices.length > 0 ? { ...teamNode, services: matchedServices } : null;
          })
          .filter(Boolean) as typeof areaNode.teams;

        return matchedTeams.length > 0 ? { ...areaNode, teams: matchedTeams } : null;
      })
      .filter(Boolean) as typeof filteredActiveHierarchy;
  }, [filteredActiveHierarchy, isSearching, search]);

  const handleCardClick = (serviceId: string) => {
    onSelectionChange(selectedId === serviceId ? null : serviceId);
  };

  const displayHierarchy = searchHierarchy ?? filteredActiveHierarchy;
  const defaultOpenAreas = useMemo(
    () => displayHierarchy.map((areaNode) => `area-${areaNode.areaName}`),
    [displayHierarchy],
  );

  return (
    <div className={styles.panel}>
      <div className={styles.viewToggle}>
        <ToggleButton
          size="small"
          appearance={viewMode === 'employees' ? 'primary' : 'subtle'}
          icon={<People20Regular />}
          checked={viewMode === 'employees'}
          onClick={() => { onIssuesFilterChange(false); onViewModeChange('employees'); }}
        >
          Employees
        </ToggleButton>
        <ToggleButton
          size="small"
          appearance={viewMode === 'services' ? 'primary' : 'subtle'}
          icon={<Briefcase20Regular />}
          checked={viewMode === 'services'}
          onClick={() => { onIssuesFilterChange(false); onViewModeChange('services'); }}
        >
          Services & Initiatives
        </ToggleButton>
        {invalidCount > 0 && (
          <ToggleButton
            size="small"
            appearance="subtle"
            icon={<Warning20Regular />}
            checked={false}
            onClick={() => {
              onIssuesFilterChange(true);
              onViewModeChange('employees');
            }}
            style={{
              color: tokens.colorPaletteRedForeground1,
              borderColor: tokens.colorPaletteRedBorder1,
              whiteSpace: 'nowrap',
            }}
          >
            ⚠️ Issues ({formatCount(invalidCount)})
          </ToggleButton>
        )}
      </div>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Dropdown
              value={selectedArea === '__all__' ? `All Services & Initiatives (${formatCount(activeCount)})` : `${selectedArea} (${formatCount(filteredCount)})`}
            selectedOptions={[selectedArea]}
            onOptionSelect={(_e, data) => setSelectedArea(data.optionValue ?? '__all__')}
            style={{ minWidth: 200 }}
            size="medium"
          >
            <Option value="__all__" text="All Services & Initiatives">All Services & Initiatives</Option>
            {areaOptions.map((area) => (
              <Option key={area} value={area} text={area}>{area}</Option>
            ))}
          </Dropdown>
        </div>
        <Input
          size="medium"
          contentBefore={<SearchRegular />}
          placeholder="Search services & initiatives..."
          value={search}
          onChange={(_e, data) => setSearch(data.value)}
        />
      </div>
      <div className={styles.list}>
        {displayHierarchy.length === 0 ? (
          <EmptyState message={isSearching ? 'No matching services or areas found' : 'No services found'} />
        ) : (
          <Accordion multiple collapsible defaultOpenItems={defaultOpenAreas}>
            {displayHierarchy.map((areaNode) => (
              <AccordionItem key={areaNode.areaName} value={`area-${areaNode.areaName}`}>
                <AccordionHeader size="large">
                  <div className={styles.areaHeader}>{areaNode.areaName}</div>
                </AccordionHeader>
                <AccordionPanel>
                  <Accordion
                    multiple
                    collapsible
                    defaultOpenItems={areaNode.teams.map((teamNode) => `team-${teamNode.team.cai_areaid}`)}
                  >
                    {areaNode.teams.map((teamNode) => (
                      <AccordionItem key={teamNode.team.cai_areaid} value={`team-${teamNode.team.cai_areaid}`}>
                        <AccordionHeader size="medium">
                          <div className={styles.teamHeader}>{teamNode.team.cai_areaname}</div>
                        </AccordionHeader>
                        <AccordionPanel>
                          <div className={styles.serviceIndent}>
                            {teamNode.services.map((service) => {
                              const metrics = metricsByServiceId.get(service.cai_serviceorinitiativeid);
                              if (!metrics) return null;
                              return (
                                <ServiceInitiativeCard
                                  key={service.cai_serviceorinitiativeid}
                                  serviceInitiative={service}
                                  metrics={metrics}
                                  maxPct={maxPct}
                                  selected={selectedId === service.cai_serviceorinitiativeid}
                                  onClick={() => handleCardClick(service.cai_serviceorinitiativeid)}
                                />
                              );
                            })}
                          </div>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
