import {
  Connection,
  Keypair,
  SendOptions,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js';
import {useState} from 'react';
import {
  MWARequestFailReason,
  SignAndSendTransactionsRequest,
  resolve,
} from '../lib/mobile-wallet-adapter-walletlib/src';

import {useWallet} from '../components/WalletProvider';
import {Text, View} from 'react-native';
import AppInfo from '../components/AppInfo';
import ButtonGroup from '../components/ButtonGroup';
import {decode} from 'bs58';
import { sendSignedTransactions, signTransactionPayloads } from '../utils/utils';

export interface SignAndSendTransactionScreenProps {
  request: SignAndSendTransactionsRequest;
}

function SignAndSendTransactionScreen(
  props: SignAndSendTransactionScreenProps,
) {
  const {request} = props;
  const {wallet, connection} = useWallet();
  const [loading, setLoading] = useState(false);

  if (!wallet) {
    throw new Error('Wallet is null or undefined');
  }

  const signAndSendTransaction = async (
    wallet: Keypair,
    connection: Connection,
    request: SignAndSendTransactionsRequest,
  ) => {
    const [validSignatures, signedTransactions] = signTransactionPayloads(
      wallet,
      request.payloads,
    );

    if (validSignatures.includes(false)) {
      resolve(request, {
        failReason: MWARequestFailReason.InvalidSignatures,
        valid: validSignatures,
      });
      return;
    }

    const [validTransactions, transactionSignatures] =
      await sendSignedTransactions(
        signedTransactions,
        request.minContextSlot ? request.minContextSlot : undefined,
        connection,
      );

    if (validTransactions.includes(false)) {
      resolve(request, {
        failReason: MWARequestFailReason.InvalidSignatures,
        valid: validTransactions,
      });
      return;
    }

    resolve(request, {signedTransactions: transactionSignatures});
  };

  const signAndSend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signAndSendTransaction(wallet, connection, request);
    } catch (e) {
      const valid = request.payloads.map(() => false);
      resolve(request, {
        failReason: MWARequestFailReason.InvalidSignatures,
        valid,
      });
    } finally {
      setLoading(false);
    }
  };

  const reject = () => {
    resolve(request, {failReason: MWARequestFailReason.UserDeclined});
  };

  return (
    <View>
      <AppInfo
        title="Sign and Send Transaction"
        appName={request.appIdentity?.identityName}
        cluster={request.cluster}
        scope={'app'}
      />
      <Text>Payloads</Text>
      <Text>
        This request has {request.payloads.length}{' '}
        {request.payloads.length > 1 ? 'payloads' : 'payload'} to sign.
      </Text>
      <ButtonGroup
        positiveButtonText="Sign and Send"
        negativeButtonText="Reject"
        positiveOnClick={signAndSend}
        negativeOnClick={reject}
      />
      {loading && <Text>Loading...</Text>}
    </View>
  );
}

export default SignAndSendTransactionScreen;
