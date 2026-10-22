import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-fly-ireland',
    version: '1.0.0',
    icon: '🪂',
    title: 'Fly Ireland',
    description: 'Paragliding sites, wind roses and forecast matching across the island of Ireland.',
    author: 'KamilYS2b7',
    repository: 'https://github.com/KamilYS2b7/fly-ireland',
    desktopUI: 'embedded',
    mobileUI: 'embedded',
    routerPath: '/fly-ireland',
    private: true,
};

export default config;
