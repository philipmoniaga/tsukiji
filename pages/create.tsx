import {
  Select,
  Box,
  Button,
  HStack,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import styles from "../styles/Create.module.css";
import {
  CreateOrderInput,
  OrderWithCounter,
} from "@opensea/seaport-js/lib/types";
import { Seaport } from "@opensea/seaport-js";
import { useAccount } from "wagmi";
import { providers } from "ethers";
import { useCallback, useState } from "react";
import {
  OfferItem,
  ConsiderationItem,
  OrderWithMetadata,
} from "types/tokenTypes";
import { NavBar } from "../components/NavBar";
import { TokenSelection } from "@components/TokenSelection";
import { Switch } from "@chakra-ui/react";
import { ItemType } from "@opensea/seaport-js/lib/constants";
import withTransition from "@components/withTransition";
import CRC32 from "crc-32";

const Create: NextPage = () => {
  const { data: accountData } = useAccount();

  const [order, setOrder] = useState<OrderWithCounter>();
  const [offerItems, setOfferItems] = useState<OfferItem[]>([]);

  const [considerationItems, setConsiderationItems] = useState<
    ConsiderationItem[]
  >([]);

  const [duration, setDuration] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [txnsuccess, setTxnSuccess] = useState<boolean>(false);

  const [isWETH, setIsWETH] = useState<boolean>(false);

  const ethersProvider = new providers.Web3Provider(
    window.ethereum as providers.ExternalProvider
  );

  const seaport = new Seaport(ethersProvider as any);

  const createSeaportOrder = async () => {
    if (!accountData) throw Error("No address found");
    setLoading(true);

    const orderParams: CreateOrderInput = {
      offer: offerItems.map((item) => item.inputItem),
      consideration: considerationItems.map((item) => item.inputItem),
      endTime: duration
        ? (Math.floor(Date.now() / 1000) + duration).toString()
        : undefined,
      fees:[{
        recipient: "0x0c0d274060766d0F8DcDebc8c4B305a3e8a676C0",
        basisPoints:  2
      }]
    };

    const { executeAllActions } = await seaport?.createOrder(
      orderParams,
      accountData?.address
    );

    const res = await executeAllActions();
    setOrder(res);
    console.log(res)
    const orderToSave: OrderWithMetadata = {
      id: CRC32.str(res.signature).toString(),
      order: res,
      offers: offerItems,
      considerations: considerationItems,
    };

    const { executeAllActions: executeAllFulfillActions  } = await seaport.fulfillOrder({
      order: res,
      accountAddress: accountData.address,
    });
    const transaction = executeAllFulfillActions();
    console.log(transaction)
    await saveOrder(orderToSave);
    setTxnSuccess(true);
    setLoading(false);
  };

  const saveOrder = useCallback(async (order: OrderWithMetadata) => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(order),
        headers: {
          "content-type": "application/json",
        },
      });
      const data = await response.json();
    } catch (err) {
      console.log("Error request: ", err);
    }
  }, []);

  const handleSelectDuration = (e: any) => {
    e.preventDefault();
    setDuration(Number(e.target.value));
  };

  const handleCurrencySwitch = (e: any) => {
    const wethSelected = e.target.checked;

    // remove ETH from order if WETH selected
    if (wethSelected) {
      const newOfferItems = offerItems.filter(
        ({ type }) => type !== ItemType.NATIVE
      );
      const newConsiderationItems = considerationItems.filter(
        ({ type }) => type !== ItemType.NATIVE
      );
      setOfferItems(newOfferItems);
      setConsiderationItems(newConsiderationItems);
    }

    // remove WETH from order if ETH selected
    if (!wethSelected) {
      const newOfferItems = offerItems.filter(
        ({ type }) => type !== ItemType.ERC20
      );
      const newConsiderationItems = considerationItems.filter(
        ({ type }) => type !== ItemType.ERC20
      );
      setOfferItems(newOfferItems);
      setConsiderationItems(newConsiderationItems);
    }

    setIsWETH(wethSelected);
  };

  return (
    <div className={styles.container}>
      <NavBar />
      <main className={styles.main}>
        <div className={`${styles.header}`}>CREATE LISTING</div>
        {!accountData?.address ? (
          <Text color="white" fontSize="1.2rem" pb={5}>
            Please connect your wallet to get started.
          </Text>
        ) : (
          <>
            <HStack className={styles.inputContainer}>
              <TokenSelection
                title="YOUR OFFER"
                setItems={setOfferItems}
                items={offerItems}
                isOffer
                account={accountData!.address!}
                isWETH={isWETH}
              />
              <TokenSelection
                title="IN EXCHANGE FOR"
                setItems={setConsiderationItems}
                items={considerationItems}
                isOffer={false}
                account={accountData!.address!}
                isWETH={isWETH}
              />
            </HStack>

            <HStack className={styles.bottomContainer}>
              <HStack>
                <Box>
                  <Text mb="6px" color={"gray"}>
                    Duration
                  </Text>
                  <div className={styles.selector}>
                    <Select
                      placeholder="Forever"
                      onChange={handleSelectDuration}
                      color="rgba(255,255,255,.7)"
                    >
                      <option value="86400">1 day</option>
                      <option value="259200">3 days</option>
                      <option value="604800">7 days</option>
                      <option value="2592000">1 month</option>
                    </Select>
                  </div>
                </Box>
                <Spacer style={{ width: "30px" }} />
                <Box>
                  <Text mb="6px" color={"gray"}>
                    Use WETH
                  </Text>
                  <Switch
                    size="lg"
                    colorScheme="teal"
                    onChange={handleCurrencySwitch}
                    className={styles.currencySwitch}
                  />
                </Box>
              </HStack>

              <Spacer style={{ width: "840px" }} />

              <VStack>
                <Button
                  onClick={createSeaportOrder}
                  fontSize="2xl"
                  size="lg"
                  disabled={
                    !accountData?.address ||
                    offerItems.length === 0 ||
                    considerationItems.length === 0
                  }
                  className={styles.confirmListingButton}
                >
                  Confirm Listing
                </Button>
                {txnsuccess && (
                  <div style={{ color: "white" }}>
                    YOUR LISTING WAS SUCCESSFUL!
                  </div>
                )}
              </VStack>
            </HStack>
          </>
        )}
      </main>
    </div>
  );
};

export default withTransition(Create);
