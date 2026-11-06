import { Redirect } from 'expo-router';

// Old template deep links must land on Home too.
export default function ExploreRedirect() { return <Redirect href="/" />; }
