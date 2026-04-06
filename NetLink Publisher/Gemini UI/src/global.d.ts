export {};

declare global {
  interface PublisherSavedProject {
    id: string;
    name: string;
    projectPath: string;
    repoUrl: string;
    githubUser: string;
    githubToken: string;
  }

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
      getInitialState: () => Promise<{ settings: PublisherSettings; project: PublisherProjectState | null; savedProjects: PublisherSavedProject[]; selectedProjectId: string }>;
      chooseProjectFolder: () => Promise<string | null>;
      saveSettings: (payload: PublisherSettings) => Promise<{ ok: boolean }>;
      saveCurrentProject: (payload: PublisherSettings & { projectId?: string; name?: string }) => Promise<{ settings: PublisherSettings; savedProjects: PublisherSavedProject[]; selectedProjectId: string }>;
      selectSavedProject: (projectId: string) => Promise<{ settings: PublisherSettings; savedProjects: PublisherSavedProject[]; selectedProjectId: string }>;
      deleteSavedProject: (projectId: string) => Promise<{ settings: PublisherSettings; savedProjects: PublisherSavedProject[]; selectedProjectId: string }>;
      refreshProject: (payload: PublisherSettings) => Promise<PublisherProjectState>;
      loadVersion: (payload: PublisherSettings) => Promise<PublisherProjectState>;
      saveVersionDraft: (payload: PublisherSettings & { version: string; buildDate: string; changelog: string[] }) => Promise<PublisherProjectState>;
      publishRelease: (payload: PublisherSettings & { version: string; buildDate: string; changelog: string[] }) => Promise<PublisherProjectState>;
    };
  }
}
