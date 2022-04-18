import type { ReactNode } from 'react';
import React, { Fragment } from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { divide, toPercentage } from '../../../shared/utils';
import { num, prettyMS, exaggerateTrendLine } from '../../helpers/utils';
import { ExternalLink } from '../common/Icons';
import Sparkline from '../graphs/Sparkline';
import type { SummaryGroupKey } from './utils';
import {
  flowEfficiency,
  decreaseIsBetter, increaseIsBetter, processSummary,
  flattenSummaryGroups, getMetricCategoryDefinitionId, allExceptExpectedKeys
} from './utils';

const renderGroupItem = (link: string) => (label: ReactNode, anchor = '') => (
  <div className="group">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-medium text-lg text-black inline-block">{label}</span>
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </div>
);

const FlowMetricsByWorkItemType: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  workItemTypeName: string;
}> = ({ groups, workItemTypes, workItemTypeName }) => (
  <details>
    <summary className="font-semibold text-xl my-2 cursor-pointer">
      <span className="inline-flex align-middle">
        <img
          src={Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.icon}
          alt={`Icon for ${Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}`}
          className="inline-block mr-1"
          width="18"
        />
        {Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}
      </span>
    </summary>

    <div className="bg-white shadow rounded-lg my-4 mb-8">
      <table className="summary-table">
        <thead>
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th />
            <th data-tip="Number of new work items added in the last 90 days">
              New
            </th>
            <th data-tip="Number of work items completed in the last 90 days">
              Velocity
            </th>
            <th data-tip="Average time taken to complete a work item over the last 90 days">
              Cycle time
            </th>
            <th data-tip="Average time taken to take a work item to production after development is complete">
              CLT
            </th>
            <th data-tip="Fraction of overall time that work items spend in work centers on average">
              Flow efficiency
            </th>
            <th data-tip="Increase in the number of WIP items over the last 90 days">
              WIP increase
            </th>
            <th data-tip="Average age of work items in progress">
              WIP age
            </th>
          </tr>
        </thead>
        <tbody>
          {groups
            .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
            .map(group => {
              const wiDefinitionId = getMetricCategoryDefinitionId(workItemTypes, workItemTypeName);
              const stats = wiDefinitionId ? group.summary[wiDefinitionId] : null;
              const summary = stats ? flattenSummaryGroups(stats) : null;
              const [filterKey] = allExceptExpectedKeys(group);
              const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
              const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
              const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

              const renderMetric = renderGroupItem(
                workItemTypes[wiDefinitionId || '']?.name[0] === 'Feature'
                  ? portfolioProjectLink
                  : projectLink
              );

              if (!summary) return null;

              return (
                <tr key={group.groupName}>
                  <td>
                    {group.groupName}
                  </td>
                  <td>
                    {renderMetric(
                      <>
                        <span className="inline-block pr-1">
                          {summary.leakage}
                        </span>
                        <Sparkline
                          data={summary.leakageByWeek}
                          lineColor={increaseIsBetter(summary.leakageByWeek)}
                        />
                      </>,
                      '#new-work-items'
                    )}
                  </td>
                  <td>
                    {renderMetric(
                      <>
                        <span className="inline-block pr-1">
                          {summary.velocity}
                        </span>
                        <Sparkline
                          data={summary.velocityByWeek}
                          lineColor={increaseIsBetter(summary.velocityByWeek)}
                        />
                      </>,
                      '#velocity'
                    )}
                  </td>
                  <td>
                    {renderMetric(
                      summary.cycleTime
                        ? (
                          <>
                            <span className="inline-block pr-1">
                              {prettyMS(summary.cycleTime)}
                            </span>
                            <Sparkline
                              data={summary.cycleTimeByWeek}
                              lineColor={decreaseIsBetter(summary.cycleTimeByWeek)}
                              yAxisLabel={prettyMS}
                            />
                          </>
                        ) : '-',
                      '#cycle-time'
                    )}
                  </td>
                  <td>
                    {renderMetric(summary.changeLeadTime
                      ? (
                        <>
                          <span className="inline-block pr-1">
                            {prettyMS(summary.changeLeadTime)}
                          </span>
                          <Sparkline
                            data={summary.changeLeadTimeByWeek}
                            lineColor={decreaseIsBetter(summary.changeLeadTimeByWeek)}
                            yAxisLabel={prettyMS}
                          />
                        </>
                      )
                      : '-',
                    '#change-lead-time')}
                  </td>
                  <td>
                    {renderMetric(
                      summary.flowEfficiency
                        ? (
                          <>
                            <span className="inline-block pr-1">
                              {`${Math.round(flowEfficiency(summary.flowEfficiency))}%`}
                            </span>
                            <Sparkline
                              data={summary.flowEfficiencyByWeek.map(flowEfficiency)}
                              lineColor={increaseIsBetter(summary.flowEfficiencyByWeek.map(flowEfficiency))}
                              yAxisLabel={x => `${x}%`}
                            />
                          </>
                        )
                        : '-',
                      '#flow-efficiency'
                    )}
                  </td>
                  <td>
                    {renderMetric(
                      summary.wipCount
                        ? (
                          <>
                            <span className="inline-block pr-1">
                              {summary.wipIncrease}
                              <span className="text-lg text-gray-500 inline-block ml-2">
                                <span className="font-normal text-sm">of</span>
                                {' '}
                                {summary.wipCount}
                              </span>
                            </span>
                            <Sparkline
                              data={summary.wipIncreaseByWeek}
                              lineColor={decreaseIsBetter(summary.wipIncreaseByWeek)}
                            />
                          </>
                        )
                        : '0',
                      '#age-of-work-in-progress-features-by-state'
                    )}
                  </td>
                  <td>
                    {renderMetric(summary.wipAge ? prettyMS(summary.wipAge) : '-', '#age-of-work-in-progress-items')}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </details>
);

const equivalientEnvironments = ['Replica', 'Pre-Prod'];

const QualityMetrics: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => {
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  if (!bugsDefinitionId) return null;
  const allEnvironments = [...new Set(groups.map(group => Object.keys(group.summary[bugsDefinitionId] || {})).flat())]
    .sort((a, b) => {
      if (!groups[0].environments) return 0;
      return groups[0].environments.indexOf(a) - groups[0].environments.indexOf(b);
    });

  let encounteredEquivalentEnvironment = false;

  return (
    <>
      {allEnvironments.map(env => {
        const envDisplayName = equivalientEnvironments.includes(env) ? equivalientEnvironments.join(' or ') : env;

        if (equivalientEnvironments.includes(env) && encounteredEquivalentEnvironment) return null;

        if (equivalientEnvironments.includes(env)) encounteredEquivalentEnvironment = true;

        return (
          <details key={envDisplayName}>
            <summary className="font-semibold text-xl my-2 cursor-pointer">
              <span className="inline-flex align-middle">
                <img
                  src={workItemTypes[bugsDefinitionId].icon}
                  alt={`Icon for ${envDisplayName} ${workItemTypes[bugsDefinitionId].name[0]}`}
                  className="inline-block mr-1"
                  width="18"
                />
                {envDisplayName}
              </span>
            </summary>

            <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
              <table className="summary-table">
                <thead>
                  <tr>
                    {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                    <th />
                    <th data-tip="Number of bugs opened in the last 90 days">
                      New bugs
                    </th>
                    <th data-tip="Number of bugs closed in the last 90 days">
                      Bugs fixed
                    </th>
                    <th data-tip="Average time taken to close a bug">
                      Bugs cycle time
                    </th>
                    <th data-tip="Average time taken to close a bug once development is complete">
                      Bugs CLT
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Fraction of overall time that work items spend in work centers on average"
                    >
                      Flow efficiency
                    </th>
                    <th data-tip="Increase in the number of WIP bugs over the last 90 days">
                      WIP increase
                    </th>
                    <th data-tip="Average age of work-in-progress bugs">
                      WIP age
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups
                    .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
                    .map(group => {
                      const bugs = group.summary[bugsDefinitionId] || {};
                      const summaryBugsForEnv = (
                        equivalientEnvironments.includes(env)
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        && bugs[equivalientEnvironments.find(e => bugs[e])!]
                      ) || bugs[env];

                      const bugsForEnv = summaryBugsForEnv ? processSummary(summaryBugsForEnv) : null;

                      const [filterKey] = allExceptExpectedKeys(group);
                      const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
                      const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

                      const renderBugMetric = renderGroupItem(portfolioProjectLink);

                      return (
                        <tr key={group.groupName}>
                          <td>{group.groupName}</td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {bugsForEnv.leakage}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.leakageByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.leakageByWeek)}
                                    />
                                  </>
                                )
                                : '-',
                              '#bug-leakage-with-root-cause'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {bugsForEnv.velocity}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.velocityByWeek}
                                      lineColor={increaseIsBetter(bugsForEnv.velocityByWeek)}
                                    />
                                  </>
                                )
                                : '-',
                              '#velocity'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv?.cycleTime
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {prettyMS(bugsForEnv.cycleTime)}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.cycleTimeByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.cycleTimeByWeek)}
                                      yAxisLabel={prettyMS}
                                    />
                                  </>
                                )
                                : '-',
                              '#cycle-time'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv?.changeLeadTime
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {prettyMS(bugsForEnv.changeLeadTime)}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.changeLeadTimeByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.changeLeadTimeByWeek)}
                                      yAxisLabel={prettyMS}
                                    />
                                  </>
                                )
                                : '-',
                              '#change-lead-time'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv?.flowEfficiency
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {`${Math.round(flowEfficiency(bugsForEnv.flowEfficiency))}%`}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.flowEfficiencyByWeek.map(flowEfficiency)}
                                      lineColor={increaseIsBetter(bugsForEnv.flowEfficiencyByWeek.map(flowEfficiency))}
                                      yAxisLabel={x => `${x}%`}
                                    />
                                  </>
                                )
                                : '-',
                              '#flow-efficiency'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    <span className="inline-block pr-1">
                                      {bugsForEnv.wipIncrease}
                                      <span className="text-lg text-gray-500 inline-block ml-2">
                                        <span className="font-normal text-sm">of</span>
                                        {' '}
                                        {bugsForEnv.wipCount}
                                      </span>
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.wipIncreaseByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.wipIncreaseByWeek)}
                                    />
                                  </>
                                )
                                : '-',
                              '#work-in-progress-trend'
                            )}
                          </td>
                          <td>
                            {renderBugMetric(bugsForEnv?.wipAge ? prettyMS(bugsForEnv.wipAge) : '-', '#age-of-work-in-progress-items')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </>
  );
};

const TestAutomationMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="summary-table">
      <thead>
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th data-tip="Number of unit / components tests running in build pipelines">
            Tests
          </th>
          <th data-tip="Percentage of code covered by tests">
            Coverage
          </th>
          {
            groups[0].pipelineStats.stages.map(stage => (
              <Fragment key={stage.name}>
                <th data-tip={`Percentage of pipelines having ${stage.name}`}>
                  {`Pipelines having ${stage.name}`}
                </th>
                <th data-tip={`Percentage of pipelines using ${stage.name}`}>
                  {`Pipelines using ${stage.name}`}
                </th>
              </Fragment>
            ))
          }

        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats, pipelineStats } = group;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
            const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

            return (
              <tr key={group.groupName}>
                <td>
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-600 font-normal">
                    {'Analysed '}
                    <b className="text-gray-800 font-semibold">{num(repoStats.repos)}</b>
                    {` ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? (
                      <>
                        {', excluded '}
                        <b className="text-gray-800 font-semibold">{num(repoStats.excluded)}</b>
                        {` ${repoStats.excluded === 1 ? 'repo' : 'repos'}`}
                      </>
                    ) : ''}
                  </p>
                </td>
                <td>
                  {reposMetric((
                    <>
                      <span className="inline-block pr-1">
                        {num(repoStats.tests)}
                      </span>
                      <Sparkline
                        data={exaggerateTrendLine(repoStats.testsByWeek)}
                        lineColor={increaseIsBetter(repoStats.testsByWeek)}
                      />
                    </>
                  ))}
                </td>
                <td>
                  {reposMetric(repoStats.coverage)}
                </td>
                {
                  pipelineStats.stages.map(stage => (
                    <Fragment key={stage.name}>
                      <td>
                        {pipelinesMetric(
                          divide(stage.exists, pipelineStats.pipelines)
                            .map(toPercentage)
                            .getOr('-')
                        )}
                      </td>
                      <td>
                        {
                          pipelinesMetric(
                            divide(stage.used, pipelineStats.pipelines)
                              .map(toPercentage)
                              .getOr('-')
                          )
                        }
                      </td>
                    </Fragment>
                  ))
                }
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const CodeQualityMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="summary-table">
      <thead>
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th data-tip="Percentage of repos with Sonar configured">
            Sonar
          </th>
          <th data-tip="Percentage of pipelines with sonar configured that pass quality checks">
            Ok
          </th>
          <th data-tip="Percentage of pipelines with sonar configured that have a warning for quality checks">
            Warn
          </th>
          <th data-tip="Percentage of pipelines with sonar configured that fail quality checks">
            Fail
          </th>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th
            className="px-12 py-3 text-left text-xs font-medium uppercase tracking-wider"
          />
          <th data-tip="Percentage of pipelines conforming to branch policies">
            Branch policy met
          </th>
        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats, pipelineStats } = group;
            const { codeQuality } = repoStats;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
            const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

            return (
              <tr key={group.groupName}>
                <td>
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-600 font-normal">
                    {'Analysed '}
                    <b className="text-gray-800 font-semibold">{num(repoStats.repos)}</b>
                    {` ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? (
                      <>
                        {', excluded '}
                        <b className="text-gray-800 font-semibold">{num(repoStats.excluded)}</b>
                        {` ${repoStats.excluded === 1 ? 'repo' : 'repos'}`}
                      </>
                    ) : ''}
                  </p>
                </td>
                <td data-tip={`${codeQuality.configured} of ${repoStats.repos} repos have SonarQube configured`}>
                  {repoStats.repos
                    ? reposMetric(
                      <>
                        <span className="inline-block pr-1">
                          {`${((codeQuality.configured / repoStats.repos) * 100).toFixed(0)}%`}
                        </span>
                        <Sparkline
                          data={exaggerateTrendLine(repoStats.newSonarSetupsByWeek)}
                          lineColor={increaseIsBetter(repoStats.newSonarSetupsByWeek)}
                          showPopover={false}
                        />
                      </>
                    )
                    : '-'}
                </td>
                <td data-tip={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}>
                  {codeQuality.sonarProjects
                    ? (
                      <>
                        <span className="inline-block pr-1">
                          {`${Math.round((codeQuality.pass / codeQuality.sonarProjects) * 100)}%`}
                        </span>
                        <Sparkline
                          data={exaggerateTrendLine(repoStats.sonarCountsByWeek.pass)}
                          lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.pass)}
                          showPopover={false}
                        />
                      </>
                    )
                    : '-'}
                </td>
                <td data-tip={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}>
                  {codeQuality.sonarProjects
                    ? (
                      <>
                        <span className="inline-block pr-1">
                          {`${Math.round((codeQuality.warn / codeQuality.sonarProjects) * 100)}%`}
                        </span>
                        <Sparkline
                          data={exaggerateTrendLine(repoStats.sonarCountsByWeek.warn)}
                          lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.warn)}
                          showPopover={false}
                        />
                      </>
                    )
                    : '-'}
                </td>
                <td data-tip={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}>
                  {codeQuality.sonarProjects
                    ? (
                      <>
                        <span className="inline-block pr-1">
                          {`${Math.round((codeQuality.fail / codeQuality.sonarProjects) * 100)}%`}
                        </span>
                        <Sparkline
                          data={exaggerateTrendLine(repoStats.sonarCountsByWeek.fail)}
                          lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.fail)}
                          showPopover={false}
                        />
                      </>
                    )

                    : '-'}
                </td>
                <td />
                <td>
                  {pipelinesMetric(
                    divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines)
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const BuildPipelines: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="summary-table">
      <thead>
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th data-tip="Number of CI builds run in the last 90 days">
            Runs
          </th>
          <th data-tip="Percentage of successful builds">
            Success
          </th>
          <th data-tip="Pipelines configured using a YAML file">
            YAML pipelines
          </th>
          <th data-tip="Average time taken to fix a build failure">
            MTTR build failure
          </th>
        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats } = group;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);

            return (
              <tr key={group.groupName}>
                <td>
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-600 font-normal">
                    {'Analysed '}
                    <b className="text-gray-800 font-semibold">{num(repoStats.repos)}</b>
                    {` ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? (
                      <>
                        {', excluded '}
                        <b className="text-gray-800 font-semibold">{num(repoStats.excluded)}</b>
                        {` ${repoStats.excluded === 1 ? 'repo' : 'repos'}`}
                      </>
                    ) : ''}
                  </p>
                </td>
                <td>
                  {reposMetric(num(repoStats.builds.total))}
                </td>
                <td>
                  {reposMetric(
                    `${repoStats.builds.total ? `${((repoStats.builds.successful * 100) / repoStats.builds.total).toFixed(0)}%` : '-'}`
                  )}
                </td>
                <td>
                  {reposMetric(
                    repoStats.ymlPipelines.total === 0
                      ? '-'
                      : `${Math.round((repoStats.ymlPipelines.count * 100) / repoStats.ymlPipelines.total)}%`
                  )}
                </td>
                <td>
                  <span className="bg-gray-100 py-1 px-2 rounded text-xs uppercase">Coming soon</span>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const ReleasePipelines: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="summary-table">
      <thead>
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th data-tip="Number of release pipelines that only release from the master branch">
            Master only pipelines
          </th>
          <th data-tip="Number of release pipelines that start with an artifact">
            Starts with artifact
          </th>
          <th data-tip="Number of release pipelines that start with an artifact">
            Repos with release pipelines
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map(group => {
          const { pipelineStats, repoStats } = group;
          const [filterKey] = allExceptExpectedKeys(group);
          const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
          const baseProjectLink = `/${group.collection}/${group.project}`;
          const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
          const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

          return (
            <tr key={group.groupName}>
              <td>
                {group.groupName}
                <p className="justify-self-end text-xs text-gray-600 font-normal">
                  {'Analysed '}
                  <b className="text-gray-800 font-semibold">{num(group.repoStats.repos)}</b>
                  {` ${group.repoStats.repos === 1 ? 'repo' : 'repos'}`}
                  {group.repoStats.excluded ? (
                    <>
                      {', excluded '}
                      <b className="text-gray-800 font-semibold">{num(group.repoStats.excluded)}</b>
                      {` ${group.repoStats.excluded === 1 ? 'repo' : 'repos'}`}
                    </>
                  ) : ''}
                </p>
              </td>
              <td>
                {pipelinesMetric(
                  divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </td>
              <td>
                {pipelinesMetric(
                  divide(pipelineStats.startsWithArtifact, pipelineStats.pipelines)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </td>
              <td>
                {reposMetric(
                  divide(repoStats.hasPipelines, repoStats.repos)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const SummaryByMetric: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => (
  <div className="mt-8">
    <h2 className="text-2xl font-bold">Flow metrics</h2>

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="Feature"
    />

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="User Story"
    />

    <h2 className="text-2xl font-bold mt-8">Quality metrics</h2>
    <QualityMetrics groups={groups} workItemTypes={workItemTypes} />

    <h2 className="text-2xl font-bold mt-8">Health metrics</h2>
    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">Test automation</summary>
      <TestAutomationMetrics groups={groups} />
    </details>

    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">Code quality</summary>
      <CodeQualityMetrics groups={groups} />
    </details>

    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">CI builds</summary>
      <BuildPipelines groups={groups} />
    </details>

    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">Releases</summary>
      <ReleasePipelines groups={groups} />
    </details>
  </div>
);

export default SummaryByMetric;
