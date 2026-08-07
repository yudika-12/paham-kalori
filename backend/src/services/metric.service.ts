import { ProfileEntity, Metrics } from "@pk/core";

export class MetricService {
  async get(profile: ProfileEntity): Promise<Metrics> {
    return profile.getMetrics();
  }
}