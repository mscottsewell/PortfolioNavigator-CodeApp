/* ── Service & Initiatives Hierarchy Tab ── */

import { useState, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Input,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Card,
  Divider,
  Link,
} from '@fluentui/react-components';
import {
  SearchRegular,
  BriefcaseRegular,
  OrganizationRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import { useServiceHierarchy } from '../../hooks';
import type { ServiceHierarchyNode } from '../../hooks';
import type { IServiceOrInitiative } from '../../types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  searchBox: {
    minWidth: '320px',
    maxWidth: '480px',
    flex: 1,
  },
  statsText: {
    whiteSpace: 'nowrap',
  },
  scrollArea: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 24px 24px',
  },
  missionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0 4px',
  },
  teamSection: {
    marginLeft: '8px',
  },
  serviceCard: {
    padding: '10px 16px',
    marginBottom: '4px',
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serviceName: {
    fontWeight: 600,
  },
  parentLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  descriptionText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    marginTop: '2px',
    lineHeight: '18px',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '6px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    lineHeight: '18px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap' as const,
  },
  chipLabel: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
  },
  centerMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  noResults: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: tokens.colorNeutralForeground3,
  },
  noResultsTitle: {
    display: 'block',
    textAlign: 'center' as const,
    width: '100%',
  },
  noResultsHelp: {
    marginTop: '12px',
    lineHeight: '20px',
  },
});

function matchesFilter(text: string | undefined | null, filter: string): boolean {
  return !!text && text.toLowerCase().includes(filter);
}

function serviceMatchesFilter(service: IServiceOrInitiative, filter: string): boolean {
  return (
    matchesFilter(service.cai_name, filter) ||
    matchesFilter(service.cai_description, filter) ||
    matchesFilter(service._ownerid_value_formatted, filter) ||
    matchesFilter(service._cai_pmleadid_value_formatted, filter) ||
    matchesFilter(service._cai_pmbusinessmanagerid_value_formatted, filter) ||
    matchesFilter(service._cai_engleadid_value_formatted, filter) ||
    matchesFilter(service._cai_engbusinessmanagerid_value_formatted, filter) ||
    matchesFilter(service._cai_area_value_formatted, filter) ||
    matchesFilter(service._cai_parentserviceorinitiativeid_value_formatted, filter)
  );
}

interface LeadershipChip {
  role: string;
  name: string;
}

function getLeadershipChips(service: IServiceOrInitiative): LeadershipChip[] {
  const chips: LeadershipChip[] = [];
  if (service._ownerid_value_formatted) chips.push({ role: 'Owner/DRI', name: service._ownerid_value_formatted });
  if (service._cai_pmleadid_value_formatted) chips.push({ role: 'PM Lead', name: service._cai_pmleadid_value_formatted });
  if (service._cai_pmbusinessmanagerid_value_formatted) chips.push({ role: 'PM BizMgr', name: service._cai_pmbusinessmanagerid_value_formatted });
  if (service._cai_engleadid_value_formatted) chips.push({ role: 'Eng Lead', name: service._cai_engleadid_value_formatted });
  if (service._cai_engbusinessmanagerid_value_formatted) chips.push({ role: 'Eng BizMgr', name: service._cai_engbusinessmanagerid_value_formatted });
  return chips;
}

function ServiceCard({ service }: { service: IServiceOrInitiative }) {
  const styles = useStyles();
  const chips = getLeadershipChips(service);

  return (
    <Card className={styles.serviceCard} size="small">
      <div className={styles.serviceHeader}>
        <BriefcaseRegular style={{ fontSize: 14, color: tokens.colorNeutralForeground3 }} />
        <Text className={styles.serviceName} size={300}>
          {service.cai_name}
        </Text>
        {service._cai_parentserviceorinitiativeid_value_formatted && (
          <Text className={styles.parentLabel}>
            → {service._cai_parentserviceorinitiativeid_value_formatted}
          </Text>
        )}
      </div>
      {service.cai_description && (
        <div className={styles.descriptionText}>{service.cai_description}</div>
      )}
      {chips.length > 0 && (
        <div className={styles.chipRow}>
          {chips.map((chip) => (
            <span key={chip.role} className={styles.chip}>
              <PersonRegular style={{ fontSize: 11 }} />
              <span className={styles.chipLabel}>{chip.role}:</span>
              {chip.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ServiceHierarchyTab() {
  const styles = useStyles();
  const { hierarchy, services, loading, error } = useServiceHierarchy();
  const [filter, setFilter] = useState('');

  const lowerFilter = filter.trim().toLowerCase();

  const filteredHierarchy = useMemo(() => {
    if (!lowerFilter) return hierarchy;

    const result: ServiceHierarchyNode[] = [];
    for (const mission of hierarchy) {
      const filteredTeams: ServiceHierarchyNode['teams'] = [];
      for (const teamEntry of mission.teams) {
        const matchingServices = teamEntry.services.filter((s) =>
          serviceMatchesFilter(s, lowerFilter) ||
          matchesFilter(mission.areaName, lowerFilter) ||
          matchesFilter(teamEntry.team.cai_areaname, lowerFilter)
        );
        if (matchingServices.length > 0) {
          filteredTeams.push({ ...teamEntry, services: matchingServices });
        }
      }
      if (filteredTeams.length > 0) {
        result.push({ ...mission, teams: filteredTeams });
      }
    }
    return result;
  }, [hierarchy, lowerFilter]);

  // When filtering, auto-expand all. Otherwise start collapsed.
  const openItems = useMemo(() => {
    if (!lowerFilter) return [];
    const items: string[] = [];
    for (const mission of filteredHierarchy) {
      items.push(`mission-${mission.areaName}`);
      for (const teamEntry of mission.teams) {
        items.push(`team-${teamEntry.team.cai_areaid}`);
      }
    }
    return items;
  }, [filteredHierarchy, lowerFilter]);

  const totalServices = services.length;
  const filteredCount = useMemo(
    () => filteredHierarchy.reduce((sum, m) => sum + m.teams.reduce((s, t) => s + t.services.length, 0), 0),
    [filteredHierarchy],
  );

  if (loading) {
    return (
      <div className={styles.centerMessage}>
        <Spinner label="Loading services & initiatives…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerMessage}>
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <OrganizationRegular style={{ fontSize: 20, color: tokens.colorNeutralForeground3 }} />
        <Input
          className={styles.searchBox}
          contentBefore={<SearchRegular />}
          placeholder="Filter by service, area, team, or lead name…"
          value={filter}
          onChange={(_e, data) => setFilter(data.value)}
        />
        <Text size={200} className={styles.statsText} style={{ color: tokens.colorNeutralForeground3 }}>
          {lowerFilter
            ? `${filteredCount} of ${totalServices} services`
            : `${totalServices} services across ${hierarchy.length} areas`}
        </Text>
      </div>

      <div className={styles.scrollArea}>
        {filteredHierarchy.length === 0 && (
          <div className={styles.noResults}>
            <Text size={400} className={styles.noResultsTitle}>No services match your filter.</Text>
            <Text size={300} className={styles.noResultsHelp}>
              For more information or to submit a request for a new Service or Initiative, contact{' '}
              <Link href="mailto:PortfolioNavigatorHelp@microsoft.com">
                PortfolioNavigatorHelp@microsoft.com
              </Link>
              .
            </Text>
          </div>
        )}

        <Accordion
          multiple
          collapsible
          defaultOpenItems={openItems}
          key={lowerFilter}
        >
          {filteredHierarchy.map((mission) => (
            <AccordionItem key={mission.areaName} value={`mission-${mission.areaName}`}>
              <AccordionHeader size="large">
                <div className={styles.missionHeader}>
                  <Text weight="bold" size={400} style={{ textTransform: 'uppercase', color: tokens.colorBrandForeground1 }}>
                    {mission.areaName}
                  </Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    ({mission.teams.reduce((s, t) => s + t.services.length, 0)} services)
                  </Text>
                </div>
              </AccordionHeader>
              <AccordionPanel>
                <Accordion multiple collapsible defaultOpenItems={lowerFilter ? mission.teams.map((t) => `team-${t.team.cai_areaid}`) : []}>
                  {mission.teams.map((teamEntry) => (
                    <AccordionItem key={teamEntry.team.cai_areaid} value={`team-${teamEntry.team.cai_areaid}`}>
                      <AccordionHeader size="medium">
                        <Text weight="semibold" size={300}>
                          {teamEntry.team.cai_areaname}
                        </Text>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginLeft: '8px' }}>
                          ({teamEntry.services.length})
                        </Text>
                      </AccordionHeader>
                      <AccordionPanel>
                        <div className={styles.teamSection}>
                          {teamEntry.services.map((service) => (
                            <ServiceCard key={service.cai_serviceorinitiativeid} service={service} />
                          ))}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        <Divider style={{ margin: '16px 0' }} />
      </div>
    </div>
  );
}
