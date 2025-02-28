import { OnNameLookupHandler, AddressLookupArgs, DomainLookupArgs } from '@metamask/snaps-sdk';
import { ethers } from 'ethers';


// Type-safe debounce function to limit the number of API calls
function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | undefined;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeoutId) clearTimeout(timeoutId);

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        fn.apply(this, args).then(resolve).catch(reject);
      }, delay);
    });
  };
}

// Function to call contract for domain resolution
async function callResolveApi(domain: string): Promise<string | null > {
  try {
    // Contract address and ABI would need to be configured based on your specific ANS contract
    const contractAddress = '0xbdF673bd60232917Ce960AD268a8bF6441CeFDdD';
    const emptyAddress = '0x0000000000000000000000000000000000000000';

    // 使用 EIP-1193 的 ethereum provider
    const provider = new ethers.BrowserProvider(ethereum);
    const contractABI = [
      "function getUserAddress(string name) view returns (address)"
    ];
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const addr = await contract.getUserAddress?(domain) : emptyAddress;

    if (addr === emptyAddress) return null;
    return addr;
  } catch (error) {
    console.error('Error resolving domain through RPC:', error);
    throw error;
  }
}

// Wrap Resolution API call in debounce function
const debouncedCallResolveApi = debounce(callResolveApi, 600);



/**
 * Handle incoming name lookup requests from the MetaMask clients.
 *
 * @param request - The request arguments.
 * @param request.domain - The domain to resolve. Will be undefined if an address is provided.
 * @param request.address - The address to resolve. Will be undefined if a domain is provided.
 * @param request.chainId - The CAIP-2 chain ID of the associated network.
 * @returns If successful, an object containing the resolvedDomain or resolvedAddress. Null otherwise.
 * @see https://docs.metamask.io/snaps/reference/exports/#onnamelookup
 */
export const onNameLookup: OnNameLookupHandler = async (request: AddressLookupArgs | DomainLookupArgs) => {
  const { chainId, address, domain } = request;

  console.log('onNameLookup', request);

  if (address) {
    // address resolution have not been able by now, ignore it
    return null;
  }

  if (domain) {
    try {
      const resolvedAddress = await debouncedCallResolveApi(domain);
      if (resolvedAddress) {
        return {
          resolvedAddresses: [
            { resolvedAddress, protocol: 'Taurus ANS Protocol', domainName: domain },
          ],
        };
      }
    } catch (error) {
      console.error(error);
    }
  }

  return null;
};
