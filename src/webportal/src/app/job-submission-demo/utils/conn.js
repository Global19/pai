// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { PAIV2 } from '@microsoft/openpai-js-sdk';
import { get } from 'lodash';
import yaml from 'js-yaml';
import urljoin from 'url-join';
import config from '../../config/webportal.config';
import { clearToken } from '../../user/user-logout/user-logout.component';

export class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'NotFoundError';
  }
}

const token = cookies.get('token');

const client = new PAIV2.OpenPAIClient({
  rest_server_uri: new URL(config.restServerUri, window.location.href),
  username: cookies.get('user'),
  token: token,
  https: window.location.protocol === 'https:',
});

const wrapper = async func => {
  try {
    return await func();
  } catch (err) {
    if (err.data.code === 'UnauthorizedUserError') {
      alert(err.data.message);
      clearToken();
    } else if (err.data.code === 'NoJobConfigError') {
      throw new NotFoundError(err.data.message);
    } else {
      throw new Error(err.data.message);
    }
  }
};

export async function submitJob(jobProtocol) {
  const job = yaml.safeLoad(jobProtocol);
  return wrapper(() => client.job.createJob(job));
}

export async function fetchJobConfig(userName, jobName) {
  return wrapper(() => client.job.getJobConfig(userName, jobName));
}

export async function listUserVirtualClusters(user) {
  const userInfo = await wrapper(() => client.user.getUser(user));
  return get(userInfo, 'virtualCluster', []);
}

export async function listHivedSkuTypes(virtualCluster) {
  if (config.launcherScheduler !== 'hivedscheduler') {
    return {};
  }
  return wrapper(async () =>
    (await fetch(
      urljoin(
        config.restServerUri,
        `/api/v2/cluster/sku-types?vc=${virtualCluster}`,
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )).json(),
  );
}
