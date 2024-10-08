import { Route, ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { config } from '@/config';

const link = 'https://www.economist.com/the-world-in-brief';

export const route: Route = {
    path: '/espresso',
    categories: ['traditional-media', 'popular'],
    view: ViewType.Articles,
    example: '/economist/espresso',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['economist.com/the-world-in-brief', 'economist.com/espresso'],
        },
    ],
    name: 'Espresso',
    maintainers: ['TonyRL'],
    handler,
    url: 'economist.com/the-world-in-brief',
};

async function handler() {
    const $ = await cache.tryGet(
        link,
        async () => {
            const response = await got(link);
            return load(response.data);
        },
        config.cache.routeExpire,
        false
    );

    const nextData = JSON.parse($('script#__NEXT_DATA__').text());
    const parts = nextData.props.pageProps.content.hasPart.parts[0].hasPart.parts.filter((part) => part.type.includes('Article') && part.headline !== '');

    const renderHTML = (node) => {
        let el;
        switch (node.type) {
            case 'tag':
                el = $(`<${node.name}>`);
                for (const name in node.attribs) {
                    el.attr(name, node.attribs[name]);
                }
                if (node.children) {
                    el.append(node.children.map((childNode) => renderHTML(childNode)));
                }
                return el;
            case 'text':
                return node.data;
            default:
                el = $('<div>');
                el.append(node.map((n) => renderHTML(n)));
                return el;
        }
    };

    const gobbetPart = parts.shift();
    const gobbets = gobbetPart.text.map((node, index) => {
        const html = renderHTML(node).html();
        return {
            guid: `${gobbetPart.id}/${index}`,
            link,
            title: gobbetPart.headline,
            pubDate: gobbetPart.datePublished,
            description: html,
        };
    });

    const articles = parts.map((part) => {
        const image = part.image.main;
        const imgNode = {
            type: 'tag',
            name: 'img',
            attribs: { width: image.width, height: image.height, src: image.url.canonical },
        };

        const html = renderHTML([imgNode, ...part.text]).html();

        return {
            link,
            guid: part.id,
            title: part.headline,
            pubDate: part.datePublished,
            description: html,
        };
    });

    return {
        title: $('head title').text(),
        link,
        description: $('meta[property="og:description"]').attr('content'),
        language: 'en-gb',
        item: [...gobbets, ...articles],
    };
}
