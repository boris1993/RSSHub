import { Route } from '@/types';
import { load } from 'cheerio';
import logger from '@/utils/logger';
import { parseDate } from '@/utils/parse-date';
import puppeteer from '@/utils/puppeteer';

export const route: Route = {
    path: '/strategyand/sustainability',
    categories: ['other'],
    example: '/pwc/strategyand/sustainability',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: {
        source: ['strategyand.pwc.com/at/en/functions/sustainability-strategy/publications.html', 'strategyand.pwc.com/'],
    },
    name: 'Sustainability',
    maintainers: ['mintyfrankie'],
    handler,
    url: 'strategyand.pwc.com/at/en/functions/sustainability-strategy/publications.html',
};

async function handler() {
    const baseUrl = 'https://www.strategyand.pwc.com/at/en/functions/sustainability-strategy/publications.html';
    const feedLang = 'en';
    const feedDescription = 'Sustainability Publications from PwC Strategy&';

    const browser = await puppeteer();
    const page = await browser.newPage();
    logger.http(`Requesting ${baseUrl}`);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        request.resourceType() === 'document' || request.resourceType() === 'script' ? request.continue() : request.abort();
    });
    await page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
    });
    const response = await page.content();
    page.close();

    const $ = load(response);

    const list = $('div#wrapper article')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            const div = item.find('div.collection__item-content').first();

            const link = a.attr('href');
            const title = div.find('h4').find('span').text();
            const pubDate = parseDate(div.find('time').attr('datetime'), 'DD/MM/YY');
            const description = div.find('p.paragraph').text();

            return {
                title,
                link,
                pubDate,
                description,
            };
        });

    const items = list;

    // TODO: Add full text support

    browser.close();

    return {
        title: 'PwC Strategy& - Sustainability Publications',
        link: baseUrl,
        language: feedLang,
        description: feedDescription,
        item: items,
    };
}