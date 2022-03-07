import { IonLabel, IonCard, IonRow, IonCol, IonContent, IonPage } from '@ionic/react';
import React, {useEffect, useMemo, useState} from 'react';
import './Home.css';
import Card from './Card';
import CollectionCard from './CollectionCard';
import Loader from "../../components/Loader";
import {environment} from "../../environments/environment";
import moment from "moment";
import {
    resolveToWalletAddress,
    getParsedNftAccountsByOwner
} from "@nfteyez/sol-rayz";
import {Connection, programs} from '@metaplex/js';
import {instance} from "../../axios";
import {Chart} from "react-chartjs-2";
// import {dispLabelsDailyCount, getDailyCountData} from '../../components/feMiscFunctions';
import {dispLabelsDailyCount, getDailyCountData} from '../../util/charts';
import {data} from "autoprefixer";
import { ChartData } from 'chart.js';
import SearchBar from '../../components/SearchBar';
import NftPriceTable from "../../components/NftPriceTable";
import FoxToken from "../../components/FoxToken";
import { AppComponentProps } from '../../components/Route';

const Home : React.FC<AppComponentProps> = ({ contentRef }) => {

    /**
     * States & Variables
     */
    const [userNfts, setUserNfts] = useState([]); // from user wallet
    const [homePageData, setHomePageData] = useState([]); // ie. possible mints...
    const [newCollections, setNewCollection] = useState([]); // from ME
    const [popularCollections, setPopularCollection] = useState([]); // from ME

    const [isLoading, setIsLoading] = useState(false);

    const [width, setWidth] = useState(window.innerWidth);

    /**
     * Use Effects
     */
    // for setting height of chart, depending on what width browser is
    const chartHeight = useMemo(() => {
        if(width > 1536) return 75;
        if(width > 1280) return 90;
        if(width > 1024) return 110;
        if(width > 768) return 155;
        if(width > 640) return 200;
        return 230;
    }, [width]);

    // resize window
    useEffect(() => {
        function resizeWidth() {
            setWidth(window.innerWidth);
        }
        window.addEventListener('resize', resizeWidth);
        return () => window.removeEventListener('resize', resizeWidth);
    }, []);

    useEffect(() => {
        fetchHomePageData();
    }, []);

    /**
     * Functions
     */
    // gets the user's nft's from their wallet
    // from https://github.com/NftEyez/sol-rayz
    // const getNfts = async (passedWalletAddress: string) => {
    //     const publicAddress = passedWalletAddress;
    //     const rawNftArray = await getParsedNftAccountsByOwner({
    //         publicAddress,
    //     });
    //     // console.log("raw user nfts: ", rawNftArray);
    //     let modifiedUserNfts: any = [];
    //     for (let i in rawNftArray) {
    //         const uri = rawNftArray[i].data.uri;
    //         if (uri.indexOf("arweave") !== -1) {
    //             let moreData: any = {};
    //             await axios.get(uri).then((res) => {
    //                 // push unique collections only
    //                 // @ts-ignore
    //                 if (!modifiedUserNfts.map(item => item.name).includes(res.data.collection.name)) {
    //                     modifiedUserNfts.push({
    //                         img: res.data.image,
    //                         name: res.data.collection.name
    //                     });
    //                 }
    //             }).catch((err) => {
    //                 console.error("error when getting arweave data: " + err);
    //             });
    //         }
    //         // console.log("modified user nfts: ", modifiedUserNfts);
    //         // @ts-ignore
    //         setUserNfts(modifiedUserNfts);
    //     }
    // }

    // get data for home page
    const fetchHomePageData = () => {
        setIsLoading(true);
        instance
            .get(environment.backendApi + '/homeData')
            .then((res) => {
                setHomePageData(res.data.data.possibleMintLinks);
                setNewCollection(res.data.data.new_collections);
                setPopularCollection(res.data.data.popular_collections);
                // console.log("res1----------------", homePageData);

                setIsLoading(false);
            })
            .catch((err) => {
                setIsLoading(false);
                console.error("error when getting home page data: " + err);
            });
    };

    const getDateAgo = function (time: any){
        return moment(time).fromNow();
    }

    /**
     * Renders
     */


    /**
     * (Putting stacked graph stuff below...)
     */
    const defaultGraph : ChartData<any, string> = {
        labels: ["1"],
        datasets: [ { data: ["3"] } ],
    };

    // search vars
    const [searchValueStacked, setSearchValueStacked] = useState('');
    const [errorSearchStacked, setErrorSearchStacked] = useState('');

    const [graphStackedLoading, setGraphStackedLoading] = useState(false);
    const [stackedLineData, setStackedLineData] = useState(defaultGraph);

    // load search data from backend, for stacked line graph
    const doSearch = async (query : string) => {
        query = query.trim();

        try {
            setErrorSearchStacked("");
            setSearchValueStacked(query);

            if(query.length === 0) {

                setStackedLineData(defaultGraph);
                return;
            }

            if(query.length < 3){ return setErrorSearchStacked('Please search on 3 or more characters'); }
            if(query.split(' ').length > 8){ return setErrorSearchStacked('Please search on 8 words max'); }

            setGraphStackedLoading(true);
            setStackedLineData(defaultGraph);

            const { data: rawFetchedData } = await instance.post<
                {
                    name: string;
                    ten_day_count: {
                        count: number;
                        date: string;
                    }[];
                }[]
            >(
                '/getWordCount/',
                {
                    array: query.split(' '),
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const colorAry = ['rgb(255, 0, 0)',
                'rgb(153, 255, 51)',
                'rgb(0, 128, 255)',
                'rgb(127, 0, 255)',
                'rgb(255, 255, 255)',
                'rgb(255, 204, 204)',
                'rgb(102, 51, 0)',
                'rgb(255, 102, 102)'];

            let datasetsAry = [];
            for(let i in rawFetchedData){
                datasetsAry.push({
                    type: 'line' as const,
                    label:  rawFetchedData[i].name,
                    borderColor: colorAry[i],
                    borderWidth: 2,
                    fill: false,
                    data: getDailyCountData(rawFetchedData[i]),
                });
            }

            const labels = dispLabelsDailyCount(rawFetchedData[0].ten_day_count, true);

            // console.log(labels);
            // console.log(datasetsAry);

            setStackedLineData({
                labels: labels,
                datasets: datasetsAry,
            });

            // set various variables
            setGraphStackedLoading(false);

        } catch (e: any) {
            console.error("try/catch in Home.tsx.doSearch: ", e);

            if (e && e.response) {
                setErrorSearchStacked(String(e.response.data.body));
            } else {
                setErrorSearchStacked('Unable to connect. Please try again later');
            }

            setGraphStackedLoading(false);
        }
    }

    return (
        <div className="w-full">
            {/* Main Content After Header - The light gray Container */}

            {/*TODO 5): remove later*/}
            {/*if need to tell the user of errors*/}
            <div className="m-3 relative bg-red-100 p-4 rounded-xl">
                <p className="text-lg text-red-700 font-medium">
                    <b>Our Discord ingestion bots decided to take a break from Fri @ 5pm est until Saturday at 940am est. They are back up and running now.</b>
                </p>
                <span className="absolute bg-red-500 w-8 h-8 flex items-center justify-center font-bold text-green-50 rounded-full -top-2 -left-2">
                    !
                </span>
            </div>

            {/* Stacked line Search stuff - The bit darker Gray Container */}
            <div
                className={`w-full bg-satin-3 rounded-lg pt-3 pb-6 pr-3 pl-3 h-fit xl:pb-3 2xl:pb-2 lg:pb-4 mb-2`}
            >
                <div
                    className={`font-bold pb-1 ${
                        width <= 640 ? 'w-full' : 'w-96 '
                    }`}
                >
                    Compare multiple words on a line graph
                </div>

                <div className={`max-w-2xl my-2`}>
                    <SearchBar
                        initialValue=""
                        onSubmit={doSearch}
                        placeholder="Type to search"
                        helpMsg='Compares multiple single words against each other (ex. "portals enviro suites").
                    Each word will be graphed and you can compare the popularity of each word (useful to search on multiple mints in the morning and see which his more popular)'
                        disableReset="false"
                    />
                </div>

                {/*--{width}--{chartHeight}--*/}

                {/*loading*/}
                {graphStackedLoading ? (
                    <div className="pt-10 flex justify-center items-center">
                        <Loader />
                    </div>
                ) : // error
                errorSearchStacked ? (
                    <div className="relative mt-6 bg-red-100 p-6 rounded-xl">
                        <p className="text-lg text-red-700 font-medium">
                            <b>
                                {(errorSearchStacked as string) ||
                                    'Unable to connect'}
                            </b>
                        </p>
                        <span className="absolute bg-red-500 w-8 h-8 flex items-center justify-center font-bold text-green-50 rounded-full -top-2 -left-2">
                            !
                        </span>
                    </div>
                ) : (
                    // graph itself
                    <div
                        className=" p-4 h-full text-white shadow-lg rounded-l bg-cbg"
                        hidden={
                            graphStackedLoading ||
                            stackedLineData.labels?.length === 1
                        }
                    >
                        <Chart
                            type="line"
                            data={stackedLineData}
                            height={chartHeight}
							key={chartHeight}
                            options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: {
                                        display: true,
                                        reverse: true,
                                    },
                                    title: {
                                        display: true,
                                        text: '# of messages per day (from several Discords)',
                                    },
                                },
                                y: {
                                    suggestedMin: 0,
                                },
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Mint Alerts Automated - Statistics */}
            <NftPriceTable foo="" onSubmit={doSearch} />

            {/* Fox Token - Analysis */}
            <div>
                {/* hidden={true} */}
                <FoxToken contentRef={contentRef} />
            </div>

            {/* Possible Mints ... */}

            {false && (
                <>
                    <IonCard>
                        <IonLabel className="text-4xl text-blue-600">
                            Possible Mints
                        </IonLabel>

                        {isLoading && (
                            <div className="pt-10 flex justify-center items-center">
                                <Loader />
                            </div>
                        )}
                        <div hidden={isLoading}>
                            {homePageData.map((product: any, index: any) => (
                                <>
                                    <Card
                                        key={index}
                                        url={product.url}
                                        readableTimestamp={getDateAgo(
                                            product.timestamp
                                        )}
                                        source={product.source}
                                    />
                                </>
                            ))}
                        </div>
                    </IonCard>
                    <div>
                        <IonRow>
                            <IonLabel className="text-4xl text-blue-600">
                                New Collection
                            </IonLabel>
                        </IonRow>

                        {/* loading bar */}
                        {isLoading && (
                            <div className="pt-10 flex justify-center items-center">
                                <Loader />
                            </div>
                        )}
                        <div hidden={!isLoading}>
                            <IonRow className="bg-lime-700">
                                {newCollections.map(
                                    (collection: any, index: any) => (
                                        <IonCol>
                                            <CollectionCard
                                                key={index}
                                                name={collection.name}
                                                description={
                                                    collection.description
                                                }
                                                image={collection.image}
                                                website={collection.website}
                                                twitter={collection.twitter}
                                                discord={collection.discord}
                                                categories={
                                                    collection.categories
                                                }
                                                splitName={collection.splitName}
                                                link={collection.link}
                                                timestamp={collection.timestamp}
                                                readableTimestamp={
                                                    collection.readableTimestamp
                                                }
                                            />
                                        </IonCol>
                                    )
                                )}
                            </IonRow>

                            <IonRow>
                                <IonLabel className="text-4xl text-blue-600">
                                    Popular Collection
                                </IonLabel>
                            </IonRow>

                            <IonRow>
                                {popularCollections.map(
                                    (collection: any, index) => (
                                        <IonCol>
                                            <CollectionCard
                                                key={index}
                                                name={collection.name}
                                                description={
                                                    collection.description
                                                }
                                                image={collection.image}
                                                website={collection.website}
                                                twitter={collection.twitter}
                                                discord={collection.discord}
                                                categories={
                                                    collection.categories
                                                }
                                                splitName={collection.splitName}
                                                link={collection.link}
                                                timestamp={collection.timestamp}
                                                readableTimestamp={
                                                    collection.readableTimestamp
                                                }
                                            />
                                        </IonCol>
                                    )
                                )}
                            </IonRow>
                        </div>
                    </div>
                </>
            )}

            {/* user's NFTs */}
            {/*<h3>User NFTs:</h3>*/}
            {/*<IonCard>*/}
            {/*    <IonContent>*/}
            {/*        <IonRow className="bg-lime-700" hidden={userNfts.length === 0}>*/}
            {/*            {userNfts.map((collection: any, index: any) => (*/}
            {/*                <IonCol>*/}
            {/*                    {collection.name}*/}
            {/*                    <br/>*/}
            {/*                    <img style={{height: "100px"}} src={collection.img} alt="" />*/}
            {/*                </IonCol>*/}
            {/*            ))}*/}
            {/*        </IonRow>*/}
            {/*    </IonContent>*/}
            {/*</IonCard>*/}
        </div>
    );
};

export default Home;
