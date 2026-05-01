/* ── Current user hook ── */

import { useEffect, useState } from 'react';
import type { IResource } from '../types';
import { getCurrentUserId, getCurrentUserName, getCurrentResourceByUserId } from '../api';

const PORTFOLIO_NAVIGATOR_HELP_EMAIL = 'PortfolioNavigatorHelp@microsoft.com';

interface MissingResourceHelp {
  emailAddress: string;
  emailHref: string;
  technicalDetails: string;
}

interface UseCurrentUserResult {
  userId: string | null;
  resource: IResource | null;
  resourceId: string | null;
  loading: boolean;
  error: string | null;
  missingResourceHelp: MissingResourceHelp | null;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [resource, setResource] = useState<IResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingResourceHelp, setMissingResourceHelp] = useState<MissingResourceHelp | null>(null);

  useEffect(() => {
    setUserId(getCurrentUserId());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentResource(): Promise<void> {
      if (!userId) {
        if (!cancelled) {
          setMissingResourceHelp(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setMissingResourceHelp(null);

      try {
        const currentResource = await getCurrentResourceByUserId(userId);
        if (cancelled) {
          return;
        }

        if (!currentResource) {
          setResource(null);
          const userName = getCurrentUserName();
          console.warn(`[PortfolioNavigator] No cai_resource found for userId: ${userId}`, { userName });
          const technicalDetails =
            `Signed in as: ${userName ?? '(unknown)'}\n` +
            `User ID (systemuser): ${userId}\n\n` +
            `No active cai_resource record found with a matching User (cai_userid) lookup.\n` +
            `Verify the resource record exists, is active (statecode = 0), and the User field points to this account.`;
          const subject = encodeURIComponent('CoreAI Portfolio Navigator access help');
          const body = encodeURIComponent(
            `Hello Portfolio Navigator Help,\n\n` +
            'I tried to open CoreAI Portfolio Navigator and I do not have a matching resource record.\n\n' +
            'Technical details:\n' +
            `${technicalDetails}\n\n` +
            'Please help me get access.\n',
          );
          setError(
            "We couldn't find your Portfolio Navigator resource record. Please contact Portfolio Navigator Help.",
          );
          setMissingResourceHelp({
            emailAddress: PORTFOLIO_NAVIGATOR_HELP_EMAIL,
            emailHref: `mailto:${PORTFOLIO_NAVIGATOR_HELP_EMAIL}?subject=${subject}&body=${body}`,
            technicalDetails,
          });
        } else {
          setResource(currentResource);
          setMissingResourceHelp(null);
        }
      } catch (err) {
        if (!cancelled) {
          setMissingResourceHelp(null);
          setError(err instanceof Error ? err.message : 'Failed to load current user resource');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCurrentResource();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    userId,
    resource,
    resourceId: resource?.cai_resourceid ?? null,
    loading,
    error,
    missingResourceHelp,
  };
}
