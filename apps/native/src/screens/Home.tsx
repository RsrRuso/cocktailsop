
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useHomeFeed } from '../features/social/queries';
import { FeedItemCard } from '../components/FeedItemCard';

export default function HomeScreen(){
  const { data, isLoading, error, refetch } = useHomeFeed({ limit: 30 });
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Header />
      {isLoading ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#9aa4b2' }}>Loading feed…</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Couldn’t load feed</Text>
          <Text style={{ color: '#9aa4b2', marginTop: 6 }}>Pull to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => `${i.type}-${i.id}`}
          contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <FeedItemCard item={item} />}
          refreshing={isLoading}
          onRefresh={() => refetch()}
        />
      )}
    </View>
  );
}
function Header(){ return (<View style={styles.header}><Text style={styles.logo}>SpecVerse</Text></View>) }
const styles = StyleSheet.create({ header:{ padding:12, backgroundColor:'rgba(0,0,0,.4)', borderColor:'rgba(255,255,255,.1)', borderBottomWidth:1 }, logo:{ color:'#fff', fontWeight:'900' } });
