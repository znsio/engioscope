import { Config } from './types';
import { pastDate } from '../utils';

export const dayInMs = 24 * 60 * 60 * 1000;

export const queryForTopLevelWorkItems = (config: Config) => {
  const daysToLookup = Math.round(
    (Date.now() - pastDate(config.azure.lookAtPast).getTime()) / dayInMs
  );

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE 
      [Source].[System.TeamProject] = @project
      AND [Source].[System.WorkItemType] = '${config.azure.workitems?.groupUnder}'
      AND [Source].[System.ChangedDate] >= @today-${daysToLookup}
      ${config.azure.workitems?.skipChildren ? (`
        AND (
          ${config.azure.workitems.skipChildren.map(wit => `
            [Target].[System.WorkItemType] <> '${wit}'
          `).join(' AND ')}
        )
      `) : ''}
    ORDER BY [Source].[System.CreatedDate] ASC
  `;
};

export const queryForAllBugsAndFeatures = (config: Config) => `
  SELECT [System.Id]
  FROM workitemLinks
  WHERE
    [Source].[System.WorkItemType] IN ('Feature', 'Bug')
    AND (
      [System.Links.LinkType] = 'Microsoft.VSTS.Common.Affects-Reverse'
      OR [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
      OR [System.Links.LinkType] = 'Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Forward'
      OR [System.Links.LinkType] = 'System.LinkTypes.Related-Forward'
    )
    ${config.azure.workitems?.skipChildren ? (`
    AND (
      ${config.azure.workitems.skipChildren.map(wit => `
        [Target].[System.WorkItemType] <> '${wit}'
      `).join(' AND ')}
    )
  `) : ''}
  ORDER BY [System.CreatedDate] ASC
  MODE (MayContain)
`;
