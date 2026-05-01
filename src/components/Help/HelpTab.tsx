import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Badge,
  makeStyles,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import { trackEvent } from '../../utils';
import userGuideMarkdown from '../../../docs/Portfolio Navigator - User Guide.md?raw';
import userAcceptanceTestsMarkdown from '../../../docs/Portfolio Navigator - User Acceptance Tests.md?raw';
import userAcceptanceTestsLiveDataMarkdown from '../../../docs/Portfolio Navigator - User Acceptance Tests (Live Data).md?raw';

type HelpDocumentId = 'user-guide' | 'training-uat' | 'live-uat';

interface HelpDocument {
  id: HelpDocumentId;
  title: string;
  badge: string;
  description: string;
  markdown: string;
}

const HELP_DOCUMENTS: HelpDocument[] = [
  {
    id: 'user-guide',
    title: 'User Guide',
    badge: 'Recommended',
    description: 'Start here for the normal monthly workflow and the main concepts in the app.',
    markdown: userGuideMarkdown,
  },
  {
    id: 'training-uat',
    title: 'Training Walkthrough',
    badge: 'Demo Data',
    description: 'Use this guided walkthrough when you want to practice in Training Mode.',
    markdown: userAcceptanceTestsMarkdown,
  },
  {
    id: 'live-uat',
    title: 'Live Data Walkthrough',
    badge: 'Live Data',
    description: 'Use this checklist when you want to validate the app against your real hierarchy and records.',
    markdown: userAcceptanceTestsLiveDataMarkdown,
  },
];

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  docTabs: {
    padding: '0 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  docSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px 0',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  contentInner: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '20px 24px 40px',
  },
  markdown: {
    color: tokens.colorNeutralForeground1,
    lineHeight: 1.6,
    '& h1': {
      fontSize: '28px',
      fontWeight: 700,
      margin: '0 0 16px',
      lineHeight: 1.2,
    },
    '& h2': {
      fontSize: '22px',
      fontWeight: 650,
      margin: '28px 0 12px',
      paddingTop: '8px',
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    '& h3': {
      fontSize: '18px',
      fontWeight: 650,
      margin: '20px 0 10px',
    },
    '& p': {
      margin: '0 0 14px',
    },
    '& ul, & ol': {
      margin: '0 0 16px 20px',
      padding: 0,
    },
    '& li': {
      marginBottom: '6px',
    },
    '& hr': {
      border: 0,
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
      margin: '24px 0',
    },
    '& blockquote': {
      margin: '16px 0',
      padding: '12px 16px',
      borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
    },
    '& code': {
      fontFamily: 'Consolas, "Courier New", monospace',
      backgroundColor: tokens.colorNeutralBackground3,
      padding: '1px 4px',
      borderRadius: tokens.borderRadiusSmall,
      fontSize: '0.95em',
    },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground3,
      padding: '12px 14px',
      borderRadius: tokens.borderRadiusMedium,
      overflowX: 'auto',
      margin: '0 0 16px',
    },
    '& pre code': {
      padding: 0,
      backgroundColor: 'transparent',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      margin: '0 0 20px',
      display: 'block',
      overflowX: 'auto',
    },
    '& th, & td': {
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      padding: '8px 10px',
      textAlign: 'left',
      verticalAlign: 'top',
    },
    '& th': {
      backgroundColor: tokens.colorNeutralBackground2,
      fontWeight: 650,
    },
    '& a': {
      color: tokens.colorBrandForegroundLink,
    },
  },
});

export function HelpTab() {
  const styles = useStyles();
  const [selectedDocId, setSelectedDocId] = useState<HelpDocumentId>('user-guide');

  const selectedDocument = useMemo<HelpDocument>(
    () => HELP_DOCUMENTS.find((doc) => doc.id === selectedDocId) ?? HELP_DOCUMENTS[0]!,
    [selectedDocId],
  );

  useEffect(() => {
    trackEvent('HelpDocumentViewed', {
      properties: {
        documentId: selectedDocument.id,
        documentTitle: selectedDocument.title,
      },
    });
  }, [selectedDocument.id, selectedDocument.title]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Text size={600} weight="semibold">
            Help
          </Text>
          <Badge appearance="tint" color="informative" size="medium">
            In-app documentation
          </Badge>
        </div>
        <Text size={300}>
          This help experience is sourced from the app&apos;s markdown documentation so the guidance stays aligned with the shipped build.
        </Text>
      </div>

      <div className={styles.docTabs}>
        <TabList
          selectedValue={selectedDocId}
          onTabSelect={(_event, data) => setSelectedDocId(data.value as HelpDocumentId)}
          size="large"
        >
          {HELP_DOCUMENTS.map((doc) => (
            <Tab key={doc.id} value={doc.id}>
              {doc.title}
            </Tab>
          ))}
        </TabList>
      </div>

      <div className={styles.docSummary}>
        <Badge appearance="outline" color="subtle">
          {selectedDocument.badge}
        </Badge>
        <Text size={300}>{selectedDocument.description}</Text>
      </div>

      <div className={styles.contentScroll}>
        <div className={styles.contentInner}>
          <div className={styles.markdown}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: (props) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
            >
              {selectedDocument.markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
