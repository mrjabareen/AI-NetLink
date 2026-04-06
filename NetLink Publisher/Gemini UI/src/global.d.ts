export {};

declare global {
  interface PublisherSettings {
    projectPath: string;
    repoUrl: string;
    githubUser: string;
    githubToken: string;
  }

  interface PublisherProjectState {
    projectName: string;
    repoRoot: string;
    frontendFolder: string;
    loadedVersion: string;
    buildDate: string;
    changelog: string[];
    githubVersion: string | null;
  }

  interface Window {
    netlinkPublisher: {
      getInitialState: () => Promise<{ settings: PublisherSettings; project: PublisherProjectState | null }>;
      chooseProjectFolder: () => Promise<string | null>;
      saveSettings: (payload: PublisherSettings) => Promise<{ ok: boolean }>;
      refreshProject: (payload: PublisherSettings) => Promise<PublisherProjectState>;
      loadVersion: (payload: PublisherSettings) => Promise<PublisherProjectState>;
      saveVersionDraft: (payload: PublisherSettings & { version: string; buildDate: string; changelog: string[] }) => Promise<PublisherProjectState>;
      publishRelease: (payload: PublisherSettings & { version: string; buildDate: string; changelog: string[] }) => Promise<PublisherProjectState>;
    };
  }
}
